/**
 * 빌드 직전 sitemap.xml 생성 — 정적 라우트 + LEARN_TOPICS(status=ready) 자동.
 * 정규식 파싱이라 learn-content.ts가 plain object array 형태인 한 안전.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ORIGIN = "https://flowstock.info";

const STATIC_URLS = [
  { loc: "/",                priority: 1.0,  changefreq: "hourly" },
  { loc: "/learn",           priority: 0.95, changefreq: "weekly" },
  { loc: "/news",            priority: 0.9,  changefreq: "hourly" },
  { loc: "/economy",         priority: 0.9,  changefreq: "daily" },
  { loc: "/macro",           priority: 0.8,  changefreq: "weekly" },
  { loc: "/screener",        priority: 0.8,  changefreq: "daily" },
  { loc: "/sectors",         priority: 0.8,  changefreq: "daily" },
  { loc: "/articles",        priority: 0.8,  changefreq: "hourly" },
  { loc: "/feedback",        priority: 0.6,  changefreq: "daily" },
  { loc: "/compare",         priority: 0.7,  changefreq: "weekly" },
  { loc: "/backtest",        priority: 0.7,  changefreq: "weekly" },
  { loc: "/earnings",        priority: 0.7,  changefreq: "weekly" },
  { loc: "/portfolio",       priority: 0.6,  changefreq: "weekly" },
  { loc: "/portfolio/game",  priority: 0.6,  changefreq: "weekly" },
];

// learn-content.ts 정규식 파싱 — `slug: "xxx"` 와 `status: "ready"` 한 블록 안에 있을 때만
const learnSrc = fs.readFileSync(path.join(root, "src/lib/learn-content.ts"), "utf8");

// slug 다음에 (lazy) 처음 나오는 status를 페어. 모든 토픽 객체에 status 필드가 있다는 가정.
const pairs = [...learnSrc.matchAll(/slug:\s*"([^"]+)"[\s\S]*?status:\s*"(ready|soon)"/g)];
const learnTopics = pairs
  .filter((m) => m[2] === "ready")
  .map((m) => m[1]);

const learnUrls = learnTopics.map((slug) => ({
  loc: `/learn/${slug}`,
  priority: 0.7,
  changefreq: "monthly",
}));

const all = [...STATIC_URLS, ...learnUrls];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
  .map(
    (u) => `  <url>
    <loc>${ORIGIN}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

// sitemap.xml — 일반 표준 위치 (다른 검색엔진/도구용, 그대로 유지)
// sitemap-pages.xml — Google Search Console fresh URL용
//   기존 sitemap.xml URL이 GSC negative cache에 박혀 "가져올 수 없음" 상태가 안 풀려서,
//   같은 내용을 새 URL로 publish해서 우회.
for (const file of ["sitemap.xml", "sitemap-pages.xml"]) {
  fs.writeFileSync(path.join(root, "public", file), xml);
}
console.log(
  `[sitemap] ${all.length} URLs (${STATIC_URLS.length} static + ${learnUrls.length} learn) → public/sitemap.xml + sitemap-pages.xml`,
);
