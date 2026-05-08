/**
 * /leaderboard — 공개 거래 + 수익률 랭킹
 *
 * - 누적 실현손익(매도 시 realizedPnl SUM) 기준 상위 20명
 * - 사용자가 공개로 표시한 거래만 집계
 * - 비로그인도 열람 가능
 */

import { useEffect, useState } from "react";
import { Trophy, Loader2, TrendingUp, TrendingDown, Lock } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { tradeApi, type LeaderboardEntry, type TradeRecord } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatKrw(value: number): string {
  if (Math.abs(value) >= 1_0000_0000) return `${(value / 1_0000_0000).toFixed(1)}억`;
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}만`;
  return value.toLocaleString();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "방금";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}일 전`;
  return d.toLocaleDateString();
}

const RANK_COLOR = ["text-amber-500", "text-zinc-400", "text-orange-700"];

export default function LeaderboardPage() {
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [boardRes, feedRes] = await Promise.all([
          tradeApi.leaderboard(20),
          tradeApi.listPublic(0, 30),
        ]);
        if (!alive) return;
        setBoard(boardRes.data ?? []);
        setTrades(feedRes.data ?? []);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "불러오기에 실패했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-500" />
              수익률 랭킹
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              모의투자에서 매도 거래를 <span className="text-foreground font-medium">공개</span>로 기록한
              사용자들의 실현손익 누적 순위입니다.
            </p>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
            {/* 랭킹 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">TOP 20</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {board.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 py-8 text-center">
                    아직 공개된 매도 거래가 없습니다.
                    <br />첫 번째 랭커가 되어보세요.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {board.map((entry) => (
                      <li
                        key={entry.memberId}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-muted/40 transition"
                      >
                        <span
                          className={`text-lg font-bold w-8 ${
                            entry.rank <= 3 ? RANK_COLOR[entry.rank - 1] : "text-muted-foreground"
                          }`}
                        >
                          {entry.rank}
                        </span>
                        <span className="flex-1 truncate font-medium">{entry.nickname}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.tradeCount}건
                        </span>
                        <span
                          className={`font-semibold tabular-nums ${
                            entry.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {entry.totalPnl >= 0 ? "+" : ""}
                          {formatKrw(entry.totalPnl)}원
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* 최근 공개 거래 피드 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">최근 공개 거래</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {trades.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 py-8 text-center flex flex-col items-center gap-2">
                    <Lock className="h-5 w-5 opacity-50" />
                    아직 공개 거래가 없습니다.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {trades.map((t) => (
                      <li key={t.id} className="px-6 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate max-w-[140px]">{t.nickname}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              t.action === "BUY"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                            }`}
                          >
                            {t.action === "BUY" ? (
                              <span className="inline-flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> 매수
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <TrendingDown className="h-3 w-3" /> 매도
                              </span>
                            )}
                          </span>
                          <span className="font-medium truncate">{t.stockName}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {formatTime(t.createdAt)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 tabular-nums">
                          {t.price.toLocaleString()}원 × {t.quantity.toLocaleString()}주
                          {t.realizedPnl != null && t.action === "SELL" && (
                            <span
                              className={`ml-2 font-medium ${
                                t.realizedPnl >= 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              ({t.realizedPnl >= 0 ? "+" : ""}
                              {formatKrw(t.realizedPnl)}원)
                            </span>
                          )}
                        </div>
                        {t.memo && (
                          <p className="text-sm mt-1 line-clamp-2 text-foreground/80">{t.memo}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
