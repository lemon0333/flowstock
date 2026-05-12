/**
 * 페이지별 <title> + meta 통일 컴포넌트.
 * - title 인자는 페이지 고유 부분 (브랜드는 자동 suffix)
 * - path는 canonical/og:url 용 — 동적 페이지(슬러그/종목)도 정확한 URL 노출
 */

import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  /** 검색에서 제외 (로그인 등 보호 페이지) */
  noindex?: boolean;
  /** schema.org JSON-LD — 페이지별 Article/Course/BreadcrumbList 등 */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_DESC =
  "주식 1도 모르는 주린이부터 단계적으로 성장 — 비유로 시작하는 45개 학습 토픽, 1,000만원 가상 모의투자, 실시간 KOSPI/KOSDAQ 시세, 백테스트 게임. 주린이를 위한 한국 주식 학습 사이트.";
const DEFAULT_IMAGE = "https://flowstock.info/og-image.svg";
const ORIGIN = "https://flowstock.info";

export default function SEO({
  title,
  description = DEFAULT_DESC,
  path,
  image = DEFAULT_IMAGE,
  noindex,
  jsonLd,
}: SEOProps) {
  const fullTitle = `${title} | FlowStock`;
  const url = path ? `${ORIGIN}${path}` : undefined;
  const ld = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {url && <link rel="canonical" href={url} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={image} />

      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {ld.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
}
