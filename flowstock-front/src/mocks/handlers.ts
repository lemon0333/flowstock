/**
 * ============================================================
 * MSW (Mock Service Worker) 핸들러
 * - 실제 API 연동 전까지 프론트엔드 개발용 목업 API
 * - GET /api/market - 시장 지수
 * - GET /api/stocks - 종목 목록
 * - GET /api/stocks/:id - 종목 상세
 * - GET /api/news - 뉴스 목록
 * - GET /api/disclosures - 공시 목록
 * - POST /api/auth/login - 로그인
 * - POST /api/auth/signup - 회원가입
 * ============================================================
 */

import { http, HttpResponse } from "msw";
import {
  marketIndices,
  stocks,
  news,
  disclosures,
  generateOHLCData,
  sectorWeights,
} from "./data";

export const handlers = [
  /** 시장 지수 조회 */
  http.get("/api/market", () => {
    return HttpResponse.json(marketIndices);
  }),

  /** 전체 종목 리스트 조회 */
  http.get("/api/stocks", () => {
    return HttpResponse.json(stocks);
  }),

  /** 개별 종목 상세 + 차트 데이터 */
  http.get("/api/stocks/:id", ({ params }) => {
    const stock = stocks.find((s) => s.id === params.id);
    if (!stock) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({
      ...stock,
      chartData: generateOHLCData(90),
      relatedNews: news.filter((n) => n.relatedStocks.includes(stock.id)),
      disclosures: disclosures.filter((d) => d.stockId === stock.id),
    });
  }),

  /** 뉴스 목록 조회 */
  http.get("/api/news", () => {
    return HttpResponse.json(news);
  }),

  /** 공시 목록 조회 */
  http.get("/api/disclosures", () => {
    return HttpResponse.json(disclosures);
  }),

  /** 섹터 비중 조회 (포트폴리오용) */
  http.get("/api/portfolio/sectors", () => {
    return HttpResponse.json(sectorWeights);
  }),

  /** 로그인 (목업) */
  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    // 간단한 목업 인증 - 나중에 실제 인증으로 교체
    if (body.email && body.password) {
      return HttpResponse.json({
        token: "mock-jwt-token-12345",
        user: {
          id: "user-1",
          email: body.email,
          name: "테스트 유저",
        },
      });
    }

    return HttpResponse.json(
      { message: "이메일 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }),

  /** 회원가입 (목업) */
  http.post("/api/auth/signup", async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; name: string };

    return HttpResponse.json({
      token: "mock-jwt-token-new-user",
      user: {
        id: "user-new",
        email: body.email,
        name: body.name,
      },
    });
  }),
];
