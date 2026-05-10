/**
 * 모든 페이지를 Playwright(Chromium)로 N회 순회하며 빈 화면/콘솔 에러 검출.
 *
 * 실행:
 *   npm run qa:pages                  # 기본 prod URL
 *   QA_BASE=http://localhost:3000 npm run qa:pages
 *   QA_REPEATS=5 npm run qa:pages     # 페이지당 반복 횟수
 *
 * 검출 기준:
 * - root 컨텐츠 길이가 50자 미만 → 빈 화면 의심
 * - console.error / window error / pageerror 발생
 * - navigation timeout (20s)
 */

import { chromium } from "playwright";

const BASE = process.env.QA_BASE || "https://flowstock.info";
const REPEATS = Number(process.env.QA_REPEATS || 2);

const PAGES = [
  "/",
  "/news",
  "/economy",
  "/macro",
  "/sectors",
  "/screener",
  "/compare",
  "/backtest",
  "/earnings",
  "/articles",
  "/learn",
  "/leaderboard",
  "/feedback",
  "/portfolio",
  "/portfolio/game",
  "/alerts",
  "/privacy",
  "/terms",
  "/login",
  "/me",
  "/admin",
];

// 무시해도 되는 noisy console 패턴 (prod에서도 정상 — 외부 SDK warning 등)
const IGNORE_PATTERNS = [
  /Failed to load resource.*favicon/i,
  /Download the React DevTools/i,
  /\[web-vitals\]/,
];

function shouldIgnore(msg) {
  return IGNORE_PATTERNS.some((p) => p.test(msg));
}

async function visit(browser, path, attempt) {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: "FlowStockQA/1.0 (Playwright)",
  });
  const page = await ctx.newPage();
  const errors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error" && !shouldIgnore(msg.text())) {
      errors.push(`console: ${msg.text().slice(0, 200)}`);
    }
  });
  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message.slice(0, 200)}`);
  });

  const t0 = Date.now();
  let rootLen = 0;
  let ok = false;
  try {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 20000 });
    // 짧게 한 번 더 기다림 — async 렌더 후 컨텐츠 확정
    await page.waitForTimeout(300);
    rootLen = await page.evaluate(() => {
      const root = document.getElementById("root");
      return root?.innerText?.trim().length ?? 0;
    });
    ok = rootLen >= 50 && errors.length === 0;
  } catch (e) {
    errors.push(`navigation: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`);
  } finally {
    await ctx.close();
  }

  return {
    path,
    attempt,
    ok,
    elapsed: Date.now() - t0,
    rootLen,
    errors,
  };
}

async function main() {
  console.log(`QA target: ${BASE} | pages=${PAGES.length} | repeats=${REPEATS}`);
  console.log("");

  const browser = await chromium.launch();
  const results = [];

  for (const path of PAGES) {
    for (let i = 1; i <= REPEATS; i++) {
      const r = await visit(browser, path, i);
      results.push(r);
      const status = r.ok ? "✅" : "❌";
      const errSuffix = r.errors.length ? ` errors=${r.errors.length}` : "";
      const blankSuffix = r.rootLen < 50 ? ` BLANK(rootLen=${r.rootLen})` : "";
      console.log(`${status} ${path}#${i} ${r.elapsed}ms${blankSuffix}${errSuffix}`);
    }
  }

  await browser.close();

  // 리포트
  const failures = results.filter((r) => !r.ok);
  console.log("");
  console.log("================ REPORT ================");
  if (failures.length === 0) {
    console.log("✅ All pages OK");
  } else {
    console.log(`❌ ${failures.length} / ${results.length} runs failed`);
    console.log("");
    // 페이지별 그룹화
    const byPath = new Map();
    for (const f of failures) {
      const arr = byPath.get(f.path) ?? [];
      arr.push(f);
      byPath.set(f.path, arr);
    }
    for (const [path, fs] of byPath) {
      console.log(`  ${path} — ${fs.length} fail`);
      // 첫 fail의 첫 에러만
      const first = fs[0];
      if (first.rootLen < 50) console.log(`    BLANK rootLen=${first.rootLen}`);
      for (const e of first.errors.slice(0, 3)) console.log(`    ${e}`);
      if (first.errors.length > 3) console.log(`    ... +${first.errors.length - 3} more`);
    }
  }

  // p95 응답시간
  const sorted = [...results].sort((a, b) => a.elapsed - b.elapsed);
  const p50 = sorted[Math.floor(sorted.length * 0.5)]?.elapsed;
  const p95 = sorted[Math.floor(sorted.length * 0.95)]?.elapsed;
  console.log("");
  console.log(`Latency: p50=${p50}ms / p95=${p95}ms`);

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
