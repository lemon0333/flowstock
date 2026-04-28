/**
 * ============================================================
 * 사이트 푸터
 * - 브랜드 + 카피 + 데이터 출처 + 면책 + 링크
 * ============================================================
 */

import { Link } from "react-router-dom";
import { TrendingUp, Github } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border bg-card/50">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          {/* 브랜드 */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-bold text-base tracking-tight text-foreground">
                Flow<span className="text-primary">Stock</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI 기반 한국 주식 분석 — 뉴스/지표/모의투자/분산투자 시각화
            </p>
          </div>

          {/* 서비스 */}
          <div>
            <div className="text-xs font-semibold text-foreground mb-2">서비스</div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground">홈</Link></li>
              <li><Link to="/economy" className="hover:text-foreground">경제지표</Link></li>
              <li><Link to="/news" className="hover:text-foreground">뉴스</Link></li>
              <li><Link to="/portfolio" className="hover:text-foreground">모의투자</Link></li>
              <li><Link to="/portfolio/game" className="hover:text-foreground">투자게임</Link></li>
              <li><Link to="/alerts" className="hover:text-foreground">알림</Link></li>
            </ul>
          </div>

          {/* 데이터 출처 */}
          <div>
            <div className="text-xs font-semibold text-foreground mb-2">데이터 출처</div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>네이버 금융 (시세/지수)</li>
              <li>한국경제 / 매일경제 / 연합뉴스 / 조선비즈 RSS</li>
              <li>Google News (검색)</li>
            </ul>
          </div>

          {/* 링크 */}
          <div>
            <div className="text-xs font-semibold text-foreground mb-2">링크</div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <a
                  href="https://github.com/lemon0333/flowstock"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Github className="h-3 w-3" /> GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://api.flowstock.info/swagger-ui.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  API 문서
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 면책 + 카피라이트 */}
        <div className="pt-5 border-t border-border/60 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            본 서비스의 데이터는 정보 제공용이며 투자 권유가 아닙니다. 모의투자는 가상 잔고이며 실거래와 무관합니다.
            가격 데이터는 지연 또는 오차가 있을 수 있습니다.
          </p>
          <div className="text-[11px] text-muted-foreground/80 whitespace-nowrap">
            © {year} FlowStock. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
