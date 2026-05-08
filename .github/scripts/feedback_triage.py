"""
사용자 개선제안(/api/feedback)을 가져와 keyword 분류 후 미처리 항목을
GitHub Issue로 생성. 매일 09 KST GitHub Actions cron.

- 분류: bug / ui-fix / feature / triage (단순 keyword heuristic, Anthropic API 0원)
- 중복 방지: 기존 issue title에 feedback ID(`fb#{id}`) 포함 검사
- 인자: env GITHUB_TOKEN, GITHUB_REPOSITORY, BACKEND_URL (기본 https://flowstock.info)
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request

BACKEND_URL = os.environ.get("BACKEND_URL", "https://api.flowstock.info").rstrip("/")
GH_TOKEN = os.environ["GITHUB_TOKEN"]
REPO = os.environ["GITHUB_REPOSITORY"]
LABEL = "user-feedback"
ISSUE_TAG_PREFIX = "fb#"

KEYWORDS = {
    "bug": ["버그", "에러", "안 됨", "안됨", "안 작동", "오류", "실패", "exception", "error", "crash", "죽어", "안 돼", "안돼", "깨져", "깨지"],
    "ui-fix": ["UI", "ui", "디자인", "예쁘", "색깔", "색상", "레이아웃", "스크롤", "모바일", "반응형", "겹침", "잘림", "어색"],
    "feature": ["추가", "있으면", "넣어줘", "넣었으면", "기능", "구현", "지원", "개선했으면", "있었으면"],
}


def classify(text: str) -> str:
    """가장 매칭 많은 카테고리 반환. 동률이면 bug > ui-fix > feature 순."""
    lower = text.lower()
    scores = {k: sum(1 for kw in v if kw.lower() in lower) for k, v in KEYWORDS.items()}
    if all(s == 0 for s in scores.values()):
        return "triage"
    return max(scores, key=lambda k: (scores[k], -["bug", "ui-fix", "feature"].index(k)))


UA = "FlowStock-FeedbackTriage/1.0 (+https://github.com/lemon0333/flowstock)"


def http_get_json(url: str, headers: dict | None = None) -> dict | list:
    h = {"User-Agent": UA, **(headers or {})}
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_post_json(url: str, body: dict, headers: dict) -> dict:
    h = {"User-Agent": UA, **headers}
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_feedbacks() -> list[dict]:
    """백엔드 /api/feedback?size=50 GET — 최신순 50개. ApiResponse<Page<...>> 또는 List."""
    try:
        raw = http_get_json(f"{BACKEND_URL}/api/feedback?size=50")
    except urllib.error.HTTPError as e:
        print(f"[fetch] HTTP {e.code}: {e.reason}", file=sys.stderr)
        return []
    # ApiResponse wrapper unwrap
    data = raw.get("data") if isinstance(raw, dict) else raw
    # Page object — content / 또는 list 그대로
    if isinstance(data, dict) and "content" in data:
        return list(data["content"])
    if isinstance(data, list):
        return data
    return []


def fetch_existing_fb_ids() -> set[int]:
    """기존 user-feedback 라벨 issue들의 title에서 fb#NN 추출."""
    headers = {
        "Authorization": f"Bearer {GH_TOKEN}",
        "Accept": "application/vnd.github+json",
    }
    ids: set[int] = set()
    page = 1
    while True:
        url = f"https://api.github.com/repos/{REPO}/issues?state=all&labels={LABEL}&per_page=100&page={page}"
        try:
            issues = http_get_json(url, headers)
        except urllib.error.HTTPError as e:
            print(f"[issues] HTTP {e.code}: {e.reason}", file=sys.stderr)
            break
        if not issues:
            break
        for it in issues:
            m = re.search(rf"{re.escape(ISSUE_TAG_PREFIX)}(\d+)", it.get("title", ""))
            if m:
                ids.add(int(m.group(1)))
        if len(issues) < 100:
            break
        page += 1
        if page > 10:  # safety
            break
    return ids


def create_issue(fb: dict, category: str) -> None:
    fb_id = fb.get("id")
    title_raw = (fb.get("title") or "").strip()[:80]
    body_text = (fb.get("body") or fb.get("content") or "").strip()
    author = fb.get("authorEmail") or fb.get("authorName") or "anonymous"
    created = fb.get("createdAt") or ""

    title = f"[{category}] {title_raw} ({ISSUE_TAG_PREFIX}{fb_id})"
    body = (
        f"**카테고리(자동)**: `{category}`\n"
        f"**작성자**: {author}\n"
        f"**작성일**: {created}\n\n"
        f"---\n\n"
        f"{body_text}\n\n"
        f"---\n\n"
        f"_FlowStock `/feedback`에서 사용자가 직접 작성한 피드백을 자동 triage. "
        f"분류는 keyword heuristic이라 부정확할 수 있음 — 실제 처리 시 라벨 수동 조정 권장._"
    )

    headers = {
        "Authorization": f"Bearer {GH_TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    }
    payload = {
        "title": title,
        "body": body,
        "labels": [LABEL, category],
    }
    try:
        res = http_post_json(
            f"https://api.github.com/repos/{REPO}/issues", payload, headers
        )
        print(f"[create] #{res.get('number')} {title}")
    except urllib.error.HTTPError as e:
        print(f"[create-fail] {e.code} {e.reason} for fb#{fb_id}", file=sys.stderr)


def main() -> int:
    feedbacks = fetch_feedbacks()
    print(f"[fetch] {len(feedbacks)} feedbacks")
    if not feedbacks:
        return 0
    existing = fetch_existing_fb_ids()
    print(f"[existing] {len(existing)} already-tracked feedback ids")

    created = 0
    for fb in feedbacks:
        fb_id = fb.get("id")
        if fb_id is None or fb_id in existing:
            continue
        text = (fb.get("title") or "") + "\n" + (fb.get("body") or fb.get("content") or "")
        category = classify(text)
        create_issue(fb, category)
        created += 1

    print(f"[done] created {created} new issues")
    return 0


if __name__ == "__main__":
    sys.exit(main())
