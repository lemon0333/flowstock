/**
 * NewsSummary 렌더 테스트 — 가장 자주 깨졌던 컴포넌트
 * - 빈 데이터 / undefined / relatedStocks 누락 케이스에서 throw 안 하는지 확인
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NewsSummary from "./NewsSummary";

const renderInRouter = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("NewsSummary", () => {
  it("뉴스가 빈 배열일 때 빈 안내 메시지 노출", () => {
    renderInRouter(<NewsSummary news={[]} disclosures={[]} />);
    expect(screen.getByText("불러올 뉴스가 없습니다")).toBeInTheDocument();
  });

  it("news/disclosures가 undefined여도 throw 안 함", () => {
    expect(() => renderInRouter(<NewsSummary />)).not.toThrow();
  });

  it("relatedStocks 필드 없는 RSS 뉴스 형태도 처리", () => {
    const news = [
      {
        id: "n1",
        title: "코스피 상승 마감",
        // relatedStocks 누락 (RSS 케이스)
        source: "한국경제",
        publishedAt: "2026-04-26T01:00:00Z",
      },
    ] as any;
    expect(() =>
      renderInRouter(<NewsSummary news={news} disclosures={[]} />),
    ).not.toThrow();
    expect(screen.getByText("코스피 상승 마감")).toBeInTheDocument();
  });

  it("relatedStocks 있을 때 종목명 매핑", () => {
    const news = [
      {
        id: "n1",
        title: "삼성 호실적",
        source: "한국경제",
        date: "2026-04-26",
        impact: "positive" as const,
        relatedStocks: ["005930"],
      },
    ];
    const stocks = [{ id: "005930", name: "삼성전자" }];
    renderInRouter(
      <NewsSummary news={news} disclosures={[]} stocks={stocks} />,
    );
    expect(screen.getByText("삼성전자")).toBeInTheDocument();
  });
});
