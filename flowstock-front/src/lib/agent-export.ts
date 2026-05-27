/**
 * 에이전트 → Claude Code 스킬 번들 텍스트 생성기.
 *
 * 출력 4파일:
 *   SKILL.md       — Claude Code가 읽는 스킬 정의 (트리거/절차)
 *   screen.py      — 종목 스크리닝 로직 (조건 박제)
 *   broker_stub.py — 매매 인터페이스 (추상). 실거래 코드는 절대 안 넣음 — 사용자가 자기 wrapper 연결
 *   README.md      — 설치 + 토스 wrapper 연결 가이드
 *
 * 핵심 안전장치: 우리는 실거래 코드를 생성하지 않는다. broker_stub는 raise NotImplementedError.
 */

import type { AgentConditions } from "./agent-templates";

export interface AgentSpec {
  name: string; // 사용자 지정 에이전트 이름
  slug: string; // 파일/스킬 id용 (kebab)
  rationale: string;
  conditions: AgentConditions;
}

const API_BASE = "https://api.flowstock.info";

export function buildSkillMd(spec: AgentSpec): string {
  const { name, slug, rationale, conditions: c } = spec;
  return `---
name: ${slug}
description: ${name} — FlowStock 빌더로 만든 종목 스크리닝 에이전트. ${rationale}
---

# ${name}

${rationale}

## 언제 실행하나

사용자가 "${name} 돌려줘", "오늘 ${name} 후보 뽑아줘" 같이 요청하면 이 스킬을 쓴다.

## 절차

1. \`python screen.py\` 실행 → FlowStock 공개 API에서 최신 KOSPI 시세를 받아 아래 조건으로 필터:
   - 가격: ${c.minPrice.toLocaleString()} ~ ${c.maxPrice.toLocaleString()}원
   - 등락률: ${c.minChangePercent}% ~ ${c.maxChangePercent}%
   - 최소 거래량: ${c.minVolume.toLocaleString()}주
   - 정렬: ${c.sortKey} ${c.sortDesc ? "내림차순" : "오름차순"}, 상위 ${c.topN}개
2. 결과 종목마다 **왜 후보인지** 한 줄로 설명한다 (등락률/거래량 근거).
3. 사용자가 매수를 원하면 \`broker_stub.py\`의 \`place_order\`를 호출한다.
   - **주의**: broker_stub은 기본적으로 NotImplementedError를 던진다. 사용자가 본인 증권사
     wrapper를 연결해야 실제 매매가 된다. 연결 안 됐으면 "모의로만 보여드릴게요"라고 안내.

## 안전 원칙

- 특정 종목 매수를 단정적으로 권하지 않는다. "후보"로만 제시하고 최종 판단은 사용자 몫임을 명확히.
- 미래 수익 보장 표현 금지.
- 실거래 연결은 사용자가 본인 책임으로 설정한 wrapper를 통해서만.
`;
}

export function buildScreenPy(spec: AgentSpec): string {
  const c = spec.conditions;
  return `"""${spec.name} — 종목 스크리닝.
FlowStock 공개 API에서 최신 KOSPI 시세를 받아 조건 필터 적용.
FlowStock 빌더가 생성한 코드 — 조건은 아래 CONDITIONS에 박혀있음.
"""

import json
import urllib.request

API_URL = "${API_BASE}/api/stocks"

CONDITIONS = {
    "min_price": ${c.minPrice},
    "max_price": ${c.maxPrice},
    "min_change_percent": ${c.minChangePercent},
    "max_change_percent": ${c.maxChangePercent},
    "min_volume": ${c.minVolume},
    "sort_key": "${c.sortKey}",
    "sort_desc": ${c.sortDesc ? "True" : "False"},
    "top_n": ${c.topN},
}


def fetch_stocks():
    req = urllib.request.Request(API_URL, headers={"User-Agent": "flowstock-agent"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        payload = json.load(resp)
    return payload.get("data") or []


def screen(stocks, c=CONDITIONS):
    out = [
        s for s in stocks
        if c["min_price"] <= (s.get("price") or 0) <= c["max_price"]
        and c["min_change_percent"] <= (s.get("changePercent") or 0) <= c["max_change_percent"]
        and (s.get("volume") or 0) >= c["min_volume"]
    ]
    out.sort(key=lambda s: s.get(c["sort_key"]) or 0, reverse=c["sort_desc"])
    return out[: c["top_n"]]


if __name__ == "__main__":
    results = screen(fetch_stocks())
    print(f"{len(results)}개 후보:")
    for s in results:
        print(
            f"  {s.get('ticker'):>8}  {s.get('name'):<16} "
            f"{s.get('price'):>10,}원  {s.get('changePercent'):>+6.2f}%  "
            f"거래량 {s.get('volume'):>14,}"
        )
`;
}

export function buildBrokerStub(): string {
  return `"""매매 인터페이스 (추상).

⚠️ 이 파일은 FlowStock이 '비워둔' 상태로 생성됩니다. 실거래 코드는 들어있지 않습니다.
실제 매수/매도를 하려면 본인이 사용하는 증권사 API wrapper를 여기에 연결하세요.
(예: 토스증권/KIS OpenAPI 등을 본인 컴퓨터에 설치하고, place_order 안에서 호출)

FlowStock은 자격증명을 보관하지도, 매매를 실행하지도 않습니다 — 전적으로 사용자 책임/설정입니다.
"""


def place_order(ticker: str, side: str, quantity: int, price: int | None = None) -> dict:
    """
    side: "buy" | "sell"
    price: None이면 시장가

    기본 구현은 NotImplementedError. 본인 wrapper로 교체하세요.
    """
    raise NotImplementedError(
        "실거래 미연결: broker_stub.place_order를 본인 증권사 wrapper로 교체해야 매매됩니다. "
        "연결 전까지는 후보 추천까지만 동작합니다."
    )
`;
}

export function buildReadme(spec: AgentSpec): string {
  return `# ${spec.name} — 설치 가이드

FlowStock 에이전트 빌더로 만든 Claude Code 스킬입니다.
**FlowStock 서버는 매매하지 않습니다.** 종목 후보를 뽑는 로직만 제공하고,
실거래는 본인이 연결한 wrapper를 통해 본인 컴퓨터에서 일어납니다.

## 1. 설치 (한 번만)

이 폴더(\`${spec.slug}/\`)를 통째로 Claude Code 스킬 디렉토리에 넣으세요:

\`\`\`bash
mkdir -p ~/.claude/skills/${spec.slug}
cp -r ./* ~/.claude/skills/${spec.slug}/
\`\`\`

## 2. 사용

본인 Claude Code 세션에서:

\`\`\`
/${spec.slug}
\`\`\`

또는 자연어로 "${spec.name} 후보 뽑아줘" 라고 하면 됩니다.
→ 최신 KOSPI 시세를 받아 조건에 맞는 종목 + 이유를 보여줍니다. (여기까진 매매 없음, 안전)

## 3. (선택) 실거래 연결

후보 추천을 넘어 **실제 매수/매도**까지 하려면:

1. 본인이 쓰는 증권사 API wrapper를 컴퓨터에 설치 (예: KIS OpenAPI 등 공식 채널).
2. \`broker_stub.py\`의 \`place_order\`를 본인 wrapper 호출로 교체.
3. ⚠️ 자기 책임. FlowStock은 이 부분에 관여하지 않습니다. 자격증명은 본인 로컬에만 두세요.

연결 전까지는 \`place_order\`가 NotImplementedError를 던져서 **실수로 매매되는 일이 없습니다.**

## 면책

- 종목 "후보"는 정보 제공일 뿐 투자 권유가 아닙니다.
- 과거/현재 데이터가 미래 수익을 보장하지 않습니다.
- 모든 투자 판단과 실거래 결과는 사용자 본인 책임입니다.
`;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export function buildBundle(spec: AgentSpec): GeneratedFile[] {
  return [
    { path: `${spec.slug}/SKILL.md`, content: buildSkillMd(spec) },
    { path: `${spec.slug}/screen.py`, content: buildScreenPy(spec) },
    { path: `${spec.slug}/broker_stub.py`, content: buildBrokerStub() },
    { path: `${spec.slug}/README.md`, content: buildReadme(spec) },
  ];
}
