/**
 * learn-content.ts → learn_topics.json 변환
 *
 * 사용:
 *   node flowstock-ai/scripts/convert_learn_content.mjs
 *
 * 입력: ../flowstock-front/src/lib/learn-content.ts
 * 출력: ../flowstock-ai/app/data/learn_topics.json
 *
 * 토픽 객체는 순수 데이터(함수 호출 없음)라 eval로 안전 추출.
 * frontend learn-content.ts 변경 시 다시 실행해서 JSON 갱신.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../../flowstock-front/src/lib/learn-content.ts");
const OUT_DIR = resolve(__dirname, "../app/data");
const OUT = resolve(OUT_DIR, "learn_topics.json");

const raw = readFileSync(SRC, "utf-8");

// LEARN_TOPICS 배열만 추출 — `export const LEARN_TOPICS: LearnTopic[] = [` 부터
// 균형 맞춰 닫는 `];` 까지
const startMarker = /export const LEARN_TOPICS\s*:\s*LearnTopic\[\]\s*=\s*\[/;
const startMatch = raw.match(startMarker);
if (!startMatch) {
  console.error("LEARN_TOPICS 시작 위치를 못 찾음");
  process.exit(1);
}
const startIdx = startMatch.index + startMatch[0].length - 1; // [ 위치

// 균형 추적해서 끝 ] 찾기
let depth = 0;
let endIdx = -1;
let inString = null;
let inLineComment = false;
let inBlockComment = false;
for (let i = startIdx; i < raw.length; i++) {
  const ch = raw[i];
  const prev = raw[i - 1];
  if (inLineComment) {
    if (ch === "\n") inLineComment = false;
    continue;
  }
  if (inBlockComment) {
    if (ch === "/" && prev === "*") inBlockComment = false;
    continue;
  }
  if (inString) {
    if (ch === inString && prev !== "\\") inString = null;
    continue;
  }
  if (ch === "/" && raw[i + 1] === "/") {
    inLineComment = true;
    continue;
  }
  if (ch === "/" && raw[i + 1] === "*") {
    inBlockComment = true;
    continue;
  }
  if (ch === '"' || ch === "'" || ch === "`") {
    inString = ch;
    continue;
  }
  if (ch === "[") depth++;
  else if (ch === "]") {
    depth--;
    if (depth === 0) {
      endIdx = i;
      break;
    }
  }
}
if (endIdx < 0) {
  console.error("LEARN_TOPICS 닫힘 [ 못 찾음");
  process.exit(1);
}

// JS array literal 그대로 추출
const arrayLiteral = raw.slice(startIdx, endIdx + 1);

// JSON 안 됨 (key unquoted, trailing comma, 백틱 등). 안전한 평가:
// 별도 모듈로 임시 import? Node에 eval로 직접.
// 토픽 안에 함수/표현식 없는지 사전 확인 — 다 string/number/object literal.
// 단, 백틱 포함 → 그대로 JS 표현식 → eval하면 string으로 변환됨.
const topics = eval(`(${arrayLiteral})`);
if (!Array.isArray(topics)) {
  console.error("eval 결과가 배열 아님");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, JSON.stringify(topics, null, 2), "utf-8");

console.log(`✅ ${topics.length}개 토픽 저장 → ${OUT}`);
console.log(
  `   audience: kid=${topics.filter((t) => t.audience === "kid").length}, ` +
  `student=${topics.filter((t) => t.audience === "student").length}, ` +
  `pro=${topics.filter((t) => t.audience === "pro").length}`
);
