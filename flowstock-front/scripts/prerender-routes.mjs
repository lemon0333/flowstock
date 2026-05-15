/**
 * 빌드 후처리 — 라우트별 dist/<path>/index.html 복제 + 페이지 메타 치환.
 *
 * 목적: SPA라 초기 HTML이 비어있어 구글봇이 페이지 가치를 판단 못하고 "발견됨 - 색인 안 됨"으로
 *      미루는 문제 우회. 라우트마다 서로 다른 title/description/canonical/og/twitter
 *      메타가 박힌 HTML을 미리 떠놓아서, 봇이 JS 실행 전에도 페이지를 구별 가능하게 만든다.
 *
 * 본문 콘텐츠는 여전히 JS 실행 후에야 보임(완전한 prerender 아님). 다만 메타만 미리 박혀도
 * "발견됨" → "색인됨" 전환에는 결정적으로 도움.
 *
 * Cloudflare Pages는 `dist/news/index.html`이 있으면 `/news` 요청에 그걸 응답하고,
 * 없으면 SPA fallback으로 `dist/index.html`을 응답. 그래서 라우트별 HTML이 우선 매칭됨.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const ORIGIN = "https://flowstock.info";

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("[prerender] dist/index.html 없음. vite build 먼저 돌리세요.");
  process.exit(1);
}

// --- 1. seo-map.ts 정규식 파싱 → 정적 라우트 메타 + DEFAULT_SEO ---
const seoMapSrc = fs.readFileSync(path.join(root, "src/lib/seo-map.ts"), "utf8");

function joinStringConcat(literal) {
  return [...literal.matchAll(/"((?:[^"\\]|\\.)*)"/g)]
    .map((mm) => mm[1])
    .join("")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const seoStatic = {};
{
  const re =
    /"(\/[^"]*)":\s*\{\s*title:\s*"((?:[^"\\]|\\.)*)"\s*,\s*description:\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)\s*,?\s*\}/g;
  let m;
  while ((m = re.exec(seoMapSrc)) !== null) {
    seoStatic[m[1]] = {
      title: m[2],
      description: joinStringConcat(m[3]),
    };
  }
}

// DEFAULT_SEO 추출 — fallback용
let DEFAULT_SEO = {
  title: "FlowStock",
  description: "주린이를 키우는 한국 주식 학습 사이트",
};
{
  const m = seoMapSrc.match(
    /DEFAULT_SEO\s*:\s*PageSEO\s*=\s*\{\s*title:\s*"((?:[^"\\]|\\.)*)"\s*,\s*description:\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)\s*,?\s*\}/,
  );
  if (m) {
    DEFAULT_SEO = { title: m[1], description: joinStringConcat(m[2]) };
  }
}

// --- 2. learn-content.ts 정규식 파싱 → 학습 토픽 메타 ---
const learnSrc = fs.readFileSync(path.join(root, "src/lib/learn-content.ts"), "utf8");
const learnTopics = [];
{
  // 토픽 객체 한 덩어리에서 slug + title + oneLiner + status를 그리디 패턴으로
  const re =
    /slug:\s*"([^"]+)"[\s\S]*?title:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?oneLiner:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?status:\s*"(ready|soon)"/g;
  let m;
  while ((m = re.exec(learnSrc)) !== null) {
    if (m[4] !== "ready") continue;
    learnTopics.push({
      slug: m[1],
      title: m[2].replace(/\\"/g, '"'),
      oneLiner: m[3].replace(/\\"/g, '"'),
    });
  }
}

// --- 3. 라우트 목록은 sitemap.xml에서 추출 (단일 소스) → 메타 매핑 ---
const sitemapXml = fs.readFileSync(path.join(root, "public/sitemap.xml"), "utf8");
const sitemapPaths = [
  ...sitemapXml.matchAll(/<loc>https:\/\/flowstock\.info([^<]*)<\/loc>/g),
].map((m) => (m[1] === "" ? "/" : m[1]));

const learnBySlug = Object.fromEntries(learnTopics.map((t) => [t.slug, t]));

const routes = {};
let missingMeta = 0;
for (const pathKey of sitemapPaths) {
  let meta;
  // 1순위: seo-map의 정적 매핑
  if (seoStatic[pathKey]) {
    meta = seoStatic[pathKey];
  } else if (pathKey.startsWith("/learn/")) {
    // 2순위: learn 토픽
    const slug = pathKey.slice("/learn/".length);
    const t = learnBySlug[slug];
    if (t) meta = { title: t.title, description: t.oneLiner };
  }
  // 3순위: DEFAULT_SEO
  if (!meta) {
    meta = DEFAULT_SEO;
    missingMeta++;
  }
  routes[pathKey] = {
    title: `${meta.title} | FlowStock`,
    description: meta.description,
  };
}

// --- 4. dist/index.html 템플릿 치환 ---
const tmpl = fs.readFileSync(path.join(dist, "index.html"), "utf8");

function escapeAttr(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHTML(pathKey, meta) {
  const url = `${ORIGIN}${pathKey}`;
  const titleSafe = escapeAttr(meta.title);
  const descSafe = escapeAttr(meta.description);
  const urlSafe = escapeAttr(url);

  let html = tmpl;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${titleSafe}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${descSafe}" />`,
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${urlSafe}" />`,
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${titleSafe}" />`,
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${descSafe}" />`,
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${urlSafe}" />`,
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${titleSafe}" />`,
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${descSafe}" />`,
  );
  return html;
}

// --- 5. dist/<path>/index.html 작성 ---
let count = 0;
for (const [pathKey, meta] of Object.entries(routes)) {
  if (pathKey === "/") continue; // 루트는 dist/index.html 그대로 (Helmet이 덮어쓰니까)
  const html = buildHTML(pathKey, meta);
  const targetDir = path.join(dist, pathKey.replace(/^\//, ""));
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "index.html"), html);
  count++;
}

console.log(
  `[prerender] ${count} routes → dist/<path>/index.html ` +
    `(sitemap ${sitemapPaths.length}, seo-map ${Object.keys(seoStatic).length}, ` +
    `learn ${learnTopics.length}, fallback ${missingMeta})`,
);
