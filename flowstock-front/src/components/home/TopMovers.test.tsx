import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TopMovers from "./TopMovers";

const renderRouted = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("TopMovers", () => {
  it("gainers/losers 미전달 시 throw 없이 빈 안내", () => {
    expect(() => renderRouted(<TopMovers />)).not.toThrow();
    expect(screen.getByText("데이터 준비 중")).toBeInTheDocument();
  });

  it("price/changePercent 누락된 항목도 0으로 폴백", () => {
    const gainers = [
      { id: "1", name: "삼성", price: 70_000, change: 1000, changePercent: 1.5, volume: "1M" },
      // changePercent / price NaN인 케이스
      { id: "2", name: "이상치", change: 0, volume: "0", price: NaN as number, changePercent: NaN as number },
    ];
    expect(() => renderRouted(<TopMovers gainers={gainers as any} losers={[]} />)).not.toThrow();
    expect(screen.getByText("삼성")).toBeInTheDocument();
    expect(screen.getByText("이상치")).toBeInTheDocument();
  });
});
