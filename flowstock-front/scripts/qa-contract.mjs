/**
 * Contract test — backend public API들이 정상 응답 + 비어있지 않은 data를 반환하는지 검증.
 *
 * Playwright sanity는 root innerText만 보고 OK 판정 → dropdown이 비어 있어도
 * 페이지는 mount되니 통과. 하지만 backend↔ai-service contract가 깨지면 빈 배열만
 * 흐르고 사용자엔 dead 화면. 이 스크립트가 그 간극을 잡는다.
 *
 * 실행:
 *   npm run qa:contract                          # prod (api.flowstock.info)
 *   QA_API_BASE=http://localhost:8080 npm run qa:contract
 */

const BASE = process.env.QA_API_BASE || "https://api.flowstock.info";

// [path, expectArray, minLen] — minLen=0 면 비어있어도 OK (data 있으나 0건일 수 있는 endpoint)
const ENDPOINTS = [
  { path: "/api/stocks", expect: "array", minLen: 1, label: "종목 시장 (모의투자 dropdown)" },
  { path: "/api/news", expect: "array", minLen: 1, label: "뉴스 latest" },
  { path: "/api/market", expect: "array", minLen: 1, label: "시장 지수" },
  { path: "/api/economy/dashboard", expect: "object", minLen: 0, label: "경제 대시보드" },
  { path: "/api/sectors", expect: "array", minLen: 1, label: "섹터 히트맵" },
  { path: "/api/macro", expect: "object", minLen: 0, label: "거시 지표" },
  { path: "/api/articles", expect: "object", minLen: 0, label: "커뮤니티 글" },
  { path: "/api/feedback", expect: "object", minLen: 0, label: "피드백" },
  { path: "/api/trades/leaderboard", expect: "array", minLen: 0, label: "leaderboard" },
];

async function check(endpoint) {
  const url = BASE + endpoint.path;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    const elapsed = Date.now() - t0;
    if (res.status !== 200) {
      return { ...endpoint, ok: false, status: res.status, elapsed, reason: `status=${res.status}` };
    }
    const json = await res.json();
    if (json?.success !== true) {
      return { ...endpoint, ok: false, status: 200, elapsed, reason: `success=${json?.success}` };
    }
    const data = json.data;
    let len;
    if (endpoint.expect === "array") {
      if (!Array.isArray(data)) {
        return { ...endpoint, ok: false, status: 200, elapsed, reason: `expected array, got ${typeof data}` };
      }
      len = data.length;
    } else {
      if (typeof data !== "object" || data === null) {
        return { ...endpoint, ok: false, status: 200, elapsed, reason: `expected object, got ${typeof data}` };
      }
      len = Object.keys(data).length;
    }
    if (len < endpoint.minLen) {
      return { ...endpoint, ok: false, status: 200, elapsed, reason: `len=${len} < minLen=${endpoint.minLen}` };
    }
    return { ...endpoint, ok: true, status: 200, elapsed, len };
  } catch (e) {
    return { ...endpoint, ok: false, elapsed: Date.now() - t0, reason: e.message };
  }
}

async function main() {
  console.log(`Contract test target: ${BASE}\n`);
  const results = [];
  for (const ep of ENDPOINTS) {
    const r = await check(ep);
    results.push(r);
    const status = r.ok ? "✅" : "❌";
    const detail = r.ok
      ? `len=${r.len} ${r.elapsed}ms`
      : `${r.reason} ${r.elapsed}ms`;
    console.log(`${status} ${r.path}  ${detail}  (${r.label})`);
  }

  const fails = results.filter((r) => !r.ok);
  console.log("");
  if (fails.length === 0) {
    console.log(`✅ All ${results.length} endpoints OK`);
  } else {
    console.log(`❌ ${fails.length} / ${results.length} endpoints failed`);
  }

  process.exit(fails.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
