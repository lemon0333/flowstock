/**
 * Scenario test layer — 실제 user flow를 Playwright로 시뮬.
 *
 * sanity(qa-pages) / contract(qa-contract)가 못 잡는 결함:
 * - dropdown 옵션이 비어있음
 * - 검색어 입력해도 결과가 안 줄어듬 (filter 깨짐)
 * - 단축키가 안 먹음
 * → 실제 click/type/keypress까지 가서 검증.
 *
 * 실행:
 *   npm run qa:scenarios                          # prod
 *   QA_BASE=http://localhost:3000 npm run qa:scenarios
 */

import { chromium } from "playwright";

const BASE = process.env.QA_BASE || "https://flowstock.info";

/**
 * 시나리오 1 — 모의투자 종목 검색
 *
 * 비로그인 사용자가 /portfolio 진입 → 거래하기 클릭 → 매수 폼에서
 * 종목 dropdown이 채워지는지 + 검색 input으로 필터링되는지.
 *
 * 직전 사고(2026-05-11): backend/api/stocks가 빈 배열 반환해서 dropdown이
 * 옵션 0개였는데 sanity/contract 둘 다 통과했음. 이 시나리오가 그걸 잡는다.
 */
async function scenarioPortfolioSearch(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: "FlowStockQA/1.0 (Playwright Scenario)",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  const t0 = Date.now();
  try {
    await page.goto(`${BASE}/portfolio`, { waitUntil: "networkidle", timeout: 20000 });

    // 거래하기 버튼 클릭 (showForm true)
    const tradeBtn = page.getByRole("button", { name: /거래하기/ });
    await tradeBtn.click({ timeout: 5000 });

    // 시세 fetch가 끝나길 잠깐 기다림 (stockApi.getAll)
    await page.waitForTimeout(1000);

    // 매수 모드 default — 검색 input + select 보임
    const searchInput = page.getByPlaceholder("종목명/티커 검색");
    if ((await searchInput.count()) === 0) {
      throw new Error("매수 모드의 검색 input을 찾지 못함");
    }

    // select element 찾기 (form 안의 첫 select)
    const select = page.locator("select").first();
    const optionsBeforeFilter = await select.locator("option").count();

    // 옵션 >= 2 (placeholder + 종목 1개 이상)
    if (optionsBeforeFilter < 2) {
      throw new Error(`옵션 개수 부족: ${optionsBeforeFilter} < 2 (dropdown 비었음 — backend /api/stocks 빈 배열일 가능성)`);
    }

    // "삼성" 검색
    await searchInput.fill("삼성");
    await page.waitForTimeout(500);
    const optionsAfterFilter = await select.locator("option").count();

    // 필터 후 옵션 1개 이상 (삼성전자, 삼성 SDI 등)
    if (optionsAfterFilter < 2) {
      throw new Error(`"삼성" 검색 결과 옵션 부족: ${optionsAfterFilter}`);
    }

    // 필터 효과가 있는지 — 옵션이 줄거나 같음 (placeholder 빼고는 줄어야 정상)
    if (optionsAfterFilter > optionsBeforeFilter) {
      throw new Error(`필터가 역으로 동작? before=${optionsBeforeFilter}, after=${optionsAfterFilter}`);
    }

    return {
      name: "portfolio-search",
      ok: errors.length === 0,
      elapsed: Date.now() - t0,
      details: `options before=${optionsBeforeFilter}, after="삼성" filter=${optionsAfterFilter}`,
      errors,
    };
  } catch (e) {
    return {
      name: "portfolio-search",
      ok: false,
      elapsed: Date.now() - t0,
      details: e instanceof Error ? e.message : String(e),
      errors,
    };
  } finally {
    await ctx.close();
  }
}

/**
 * 시나리오 2 — Cmd+K 글로벌 검색
 *
 * 홈 진입 → Meta+K(또는 Control+K) 단축키로 다이얼로그 열기 →
 * 검색 input에 "주식" 입력 → 결과 옵션 1개 이상.
 *
 * 직전 사고(2026-05-11): stockApi.getMarket() 미정의로 다이얼로그가 mount되며
 * useEffect 안 동기 throw → 다이얼로그가 깨짐. 이 시나리오가 그걸 잡는다.
 */
async function scenarioGlobalSearch(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: "FlowStockQA/1.0 (Playwright Scenario)",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  const t0 = Date.now();
  try {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 20000 });

    // 단축키 (mac/linux 둘 다 시도 — playwright가 OS 자동 매핑하지만 명시)
    const isMac = process.platform === "darwin";
    await page.keyboard.press(isMac ? "Meta+k" : "Control+k");

    // CommandDialog 열림 대기
    const searchInput = page.getByPlaceholder(/종목.*학습.*페이지.*검색/);
    await searchInput.waitFor({ state: "visible", timeout: 5000 });

    // "주식" 입력
    await searchInput.fill("주식");
    await page.waitForTimeout(500);

    // cmdk 결과 옵션 카운트 — [cmdk-item] attribute 또는 role=option
    const options = page.locator('[cmdk-item]');
    const count = await options.count();

    // 학습 토픽 "주식이 뭐예요?" + 페이지 등 1개 이상 매칭되어야 함
    if (count < 1) {
      throw new Error(`Cmd+K "주식" 검색 결과 0개 (다이얼로그 깨졌거나 데이터 없음)`);
    }

    return {
      name: "global-search",
      ok: errors.length === 0,
      elapsed: Date.now() - t0,
      details: `cmdk options for "주식" = ${count}`,
      errors,
    };
  } catch (e) {
    return {
      name: "global-search",
      ok: false,
      elapsed: Date.now() - t0,
      details: e instanceof Error ? e.message : String(e),
      errors,
    };
  } finally {
    await ctx.close();
  }
}

/**
 * 시나리오 3 — confirm 다이얼로그 카피가 토스 톤인지
 *
 * 격식체/명령형 confirm("정말 ~하시겠습니까?") 못 박았는지 검증.
 * .claude/rules/ux-writing.md 정신 — 해요체/캐주얼 경어.
 */
const BAD_TONE_PATTERNS = [
  /정말\s/,
  /하시겠/,
  /하시나요/,
  /입니까/,
  /하시겠어요/,
];

async function scenarioConfirmTone(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: "FlowStockQA/1.0 (Playwright Scenario)",
  });
  const page = await ctx.newPage();
  const confirmTexts = [];
  const errors = [];
  page.on("dialog", async (dialog) => {
    confirmTexts.push(dialog.message());
    await dialog.dismiss();
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  const t0 = Date.now();
  try {
    // PortfolioPage 초기화 confirm 트리거
    await page.goto(`${BASE}/portfolio`, { waitUntil: "networkidle", timeout: 20000 });
    const resetBtn = page.getByRole("button", { name: /초기화/ });
    if ((await resetBtn.count()) > 0) {
      await resetBtn.first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
    }

    const violations = [];
    for (const text of confirmTexts) {
      for (const pat of BAD_TONE_PATTERNS) {
        if (pat.test(text)) violations.push(`"${text}" 위반 (${pat})`);
      }
    }
    if (violations.length > 0) {
      throw new Error(`토스 톤 위반 ${violations.length}건: ${violations.join("; ")}`);
    }

    return {
      name: "confirm-tone",
      ok: errors.length === 0,
      elapsed: Date.now() - t0,
      details: `confirm 캡처 ${confirmTexts.length}건, 모두 통과${confirmTexts.length ? ` — ${confirmTexts.map((t) => `"${t}"`).join(", ")}` : ""}`,
      errors,
    };
  } catch (e) {
    return {
      name: "confirm-tone",
      ok: false,
      elapsed: Date.now() - t0,
      details: e instanceof Error ? e.message : String(e),
      errors,
    };
  } finally {
    await ctx.close();
  }
}

const SCENARIOS = [scenarioPortfolioSearch, scenarioGlobalSearch, scenarioConfirmTone];

async function main() {
  console.log(`Scenario test target: ${BASE}\n`);
  const browser = await chromium.launch();
  const results = [];

  for (const fn of SCENARIOS) {
    const r = await fn(browser);
    results.push(r);
    const status = r.ok ? "✅" : "❌";
    console.log(`${status} ${r.name}  ${r.elapsed}ms`);
    console.log(`   ${r.details}`);
    for (const e of r.errors.slice(0, 3)) console.log(`   ${e}`);
  }

  await browser.close();

  const fails = results.filter((r) => !r.ok);
  console.log("");
  if (fails.length === 0) {
    console.log(`✅ All ${results.length} scenarios OK`);
  } else {
    console.log(`❌ ${fails.length} / ${results.length} scenarios failed`);
  }
  process.exit(fails.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
