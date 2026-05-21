/**
 * 챗봇 응답용 미니 마크다운 렌더러.
 * - 시스템 프롬프트가 ** 굵게, "- " 불릿, [text](url) 링크를 유도하므로 그 셋이 핵심.
 * - 외부 dep 안 쓰는 이유: bundle size + 챗봇 답변은 단순한 인라인/리스트 위주라 react-markdown까지 필요 X.
 * - streaming 중간(닫는 ** 없음 등)에도 깨지지 않게 토큰 매치 실패 시 raw 텍스트로 떨어뜨림.
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let buf = "";
  let i = 0;
  let n = 0;
  const flush = () => {
    if (buf) {
      out.push(buf);
      buf = "";
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // **bold** — 닫는 ** 있어야만 적용
    if (ch === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push(
          <strong key={`${keyBase}-b${n++}`} className="font-semibold">
            {text.slice(i + 2, end)}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    // `code`
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        out.push(
          <code
            key={`${keyBase}-c${n++}`}
            className="px-1 py-0.5 rounded bg-muted text-[0.85em] font-mono"
          >
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }

    // [text](url)
    if (ch === "[") {
      const labelEnd = text.indexOf("](", i + 1);
      const urlEnd = labelEnd > 0 ? text.indexOf(")", labelEnd + 2) : -1;
      if (labelEnd > i + 1 && urlEnd > labelEnd) {
        const label = text.slice(i + 1, labelEnd);
        const url = text.slice(labelEnd + 2, urlEnd);
        flush();
        if (url.startsWith("/")) {
          out.push(
            <Link
              key={`${keyBase}-l${n++}`}
              to={url}
              className="text-primary hover:underline"
            >
              {label}
            </Link>,
          );
        } else {
          out.push(
            <a
              key={`${keyBase}-l${n++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {label}
            </a>,
          );
        }
        i = urlEnd + 1;
        continue;
      }
    }

    buf += ch;
    i++;
  }
  flush();
  return out;
}

export function renderChatMarkdown(text: string): ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let blockKey = 0;
  let listKey = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems;
    listItems = [];
    const k = listKey++;
    blocks.push(
      <ul key={`ul-${k}`} className="list-disc pl-5 space-y-0.5 my-1">
        {items.map((item, idx) => (
          <li key={idx}>{renderInline(item, `li-${k}-${idx}`)}</li>
        ))}
      </ul>,
    );
  };

  let paragraphBuf: string[] = [];
  const flushParagraph = () => {
    if (paragraphBuf.length === 0) return;
    const joined = paragraphBuf.join("\n");
    paragraphBuf = [];
    const k = blockKey++;
    blocks.push(
      <p key={`p-${k}`} className="whitespace-pre-wrap leading-relaxed">
        {renderInline(joined, `p-${k}`)}
      </p>,
    );
  };

  for (const raw of lines) {
    const m = raw.match(/^\s*[-*]\s+(.+)$/);
    if (m) {
      flushParagraph();
      listItems.push(m[1]);
      continue;
    }
    flushList();
    if (raw.trim() === "") {
      flushParagraph();
      blocks.push(<div key={`gap-${blockKey++}`} className="h-2" aria-hidden />);
    } else {
      paragraphBuf.push(raw);
    }
  }
  flushParagraph();
  flushList();

  return blocks;
}
