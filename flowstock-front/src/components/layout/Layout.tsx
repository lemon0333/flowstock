/**
 * Layout (deprecated wrapper) — 실제 헤더/사이드바는 RootShell.
 * 페이지의 <Layout> import를 그대로 두면서, path별 자동 SEO 메타를 주입.
 * 동적 페이지(/learn/:slug 등)는 페이지 자체에서 <SEO> 컴포넌트로 덮어쓰면 됨 (Helmet last-write-wins).
 */

import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SEO_BY_PATH, NOINDEX_PATHS, DEFAULT_SEO } from "@/lib/seo-map";

interface LayoutProps {
  children: React.ReactNode;
}

const ORIGIN = "https://flowstock.info";
const DEFAULT_IMAGE = `${ORIGIN}/og-image.svg`;

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const seo = SEO_BY_PATH[pathname] || DEFAULT_SEO;
  const fullTitle = `${seo.title} | FlowStock`;
  const url = `${ORIGIN}${pathname}`;
  const noindex = NOINDEX_PATHS.has(pathname);

  return (
    <>
      <Helmet>
        <title>{fullTitle}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={url} />
        {noindex && <meta name="robots" content="noindex, nofollow" />}
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={DEFAULT_IMAGE} />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={seo.description} />
        <meta name="twitter:image" content={DEFAULT_IMAGE} />
      </Helmet>
      {children}
    </>
  );
}
