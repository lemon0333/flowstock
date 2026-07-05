/**
 * ============================================================
 * 후회 계산기 (/regret) — "내가 얼마나 못 벌었을까?"
 *
 * 종목 + 진입 시점 + 금액만 넣으면:
 *   · 그때 샀다면 지금 얼마? (현재가 손익)
 *   · 보유 중 최고가에 팔았다면? (놓친 최대 수익 = FOMO)
 * 결과는 링크/카카오/공유로 퍼뜨릴 수 있고, 공유 링크를 열면 같은 결과가 재현됨.
 * ============================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Share2, Link2, MessageCircle, TrendingDown, Loader2, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { stockApi } from "@/services/api";
import type { OHLCV } from "@/lib/indicators";
import { calcRegret, won, wonKo, pctStr, type RegretResult } from "@/lib/regret";
import { loadKakao } from "@/lib/kakao";
import { toast } from "sonner";

interface UStock {
  id: string;
  ticker: string;
  name: string;
  market: "KR" | "US";
}

const AMOUNT_CHIPS = [100_000, 1_000_000, 5_000_000, 10_000_000];
const todayStr = () => new Date().toISOString().slice(0, 10);
const yearsAgoStr = (y: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  return d.toISOString().slice(0, 10);
};

export default function RegretPage() {
  const [params, setParams] = useSearchParams();
  const [universe, setUniverse] = useState<UStock[]>([]);
  const [stockId, setStockId] = useState(params.get("stock") || "");
  const [entryDate, setEntryDate] = useState(params.get("date") || yearsAgoStr(1));
  const [amount, setAmount] = useState(Number(params.get("amount")) || 1_000_000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RegretResult | null>(null);
  const [resultStock, setResultStock] = useState<UStock | null>(null);
  const autoRan = useRef(false);

  // 종목 유니버스 (KR + US)
  useEffect(() => {
    let alive = true;
    Promise.all([
      stockApi.getAll().then((r) => r.data ?? []).catch(() => []),
      stockApi.getAll("US").then((r) => r.data ?? []).catch(() => []),
    ]).then(([kr, us]) => {
      if (!alive) return;
      const norm = (arr: any[], market: "KR" | "US"): UStock[] =>
        (arr as any[]).map((s) => ({
          id: String(s.id ?? s.ticker),
          ticker: String(s.ticker ?? s.id),
          name: String(s.name ?? ""),
          market,
        }));
      const all = [...norm(kr, "KR"), ...norm(us, "US")];
      setUniverse(all);
      if (!stockId && all.length) setStockId(all[0].id);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (sid = stockId, date = entryDate, amt = amount) => {
    const stock = universe.find((s) => s.id === sid) || resultStock;
    if (!sid) {
      setError("종목을 선택해주세요.");
      return;
    }
    if (date > todayStr()) {
      setError("진입일은 오늘보다 미래일 수 없어요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // 진입일~오늘 일수 + 버퍼만큼 가격 요청 (백엔드 상한이 있으면 가장 이른 날로 자동 보정)
      const days = Math.min(
        4000,
        Math.max(400, Math.ceil((Date.now() - new Date(date).getTime()) / 86_400_000) + 30),
      );
      const res = await stockApi.getOhlcv(sid, days);
      const ohlcv: OHLCV[] = ((res.data ?? []) as any[]).map((d) => ({
        date: String(d.date ?? ""),
        open: Number(d.open),
        high: Number(d.high),
        low: Number(d.low),
        close: Number(d.close),
        volume: Number(d.volume),
      }));
      const r = calcRegret({ ohlcv, entryDate: date, amount: amt });
      if (!r) {
        setError("그 시점의 가격 데이터가 없어요. 다른 날짜로 시도해보세요.");
        setResult(null);
        return;
      }
      setResult(r);
      setResultStock(stock || null);
      setParams({ stock: sid, date, amount: String(amt) }, { replace: true });
    } catch (e: any) {
      setError(e?.message || "계산 중 문제가 생겼어요.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // 공유 링크로 들어오면 자동 계산
  useEffect(() => {
    if (autoRan.current) return;
    if (params.get("stock") && universe.length) {
      autoRan.current = true;
      run(params.get("stock")!, params.get("date") || entryDate, Number(params.get("amount")) || amount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universe]);

  const shareText = useMemo(() => {
    if (!result || !resultStock) return "";
    const nm = resultStock.name;
    if (result.profit >= 0)
      return `😭 ${result.entryDate}에 ${nm}에 ${wonKo(amount)} 넣었으면 지금 ${wonKo(
        result.currentValue,
      )} (${pctStr(result.pct)})! ${wonKo(result.profit)} 못 벌었네… 최고점에 팔았으면 ${wonKo(
        result.maxProfit,
      )}였음 🤯`;
    return `😮‍💨 ${result.entryDate}에 ${nm} 안 사길 잘했다 — 샀으면 ${wonKo(
      Math.abs(result.profit),
    )} 잃었을 뻔 (${pctStr(result.pct)})`;
  }, [result, resultStock, amount]);

  const shareUrl = () =>
    `${window.location.origin}/regret?stock=${stockId}&date=${entryDate}&amount=${amount}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      toast.success("링크를 복사했어요 — 친구한테 보내보세요!");
    } catch {
      toast.error("복사 실패. 주소창의 URL을 직접 복사해주세요.");
    }
  };
  const nativeShare = async () => {
    const data = { title: "FlowStock 후회 계산기", text: shareText, url: shareUrl() };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        /* 사용자 취소 */
      }
    } else {
      copyLink();
    }
  };
  const shareKakao = async () => {
    if (!result || !resultStock) return;
    const K = await loadKakao();
    if (K?.Share?.sendDefault) {
      const link = { webUrl: shareUrl(), mobileWebUrl: shareUrl() };
      K.Share.sendDefault({
        objectType: "feed",
        content: {
          title: `${result.entryDate}에 ${resultStock.name}에 ${wonKo(amount)} 넣었다면`,
          description:
            result.profit >= 0
              ? `지금 ${wonKo(result.currentValue)} (${pctStr(result.pct)}) · 못 번 돈 ${wonKo(result.profit)} 😭`
              : `샀으면 ${wonKo(Math.abs(result.profit))} 잃었을 뻔 (${pctStr(result.pct)}) 😮‍💨`,
          imageUrl: `${window.location.origin}/share-regret-card.png`,
          link,
        },
        buttons: [{ title: "나도 계산해보기", link }],
      });
    } else {
      // 키/SDK 없이도 공유가 끊기지 않게 — 링크 복사 폴백
      try {
        await navigator.clipboard.writeText(shareUrl());
        toast.success("링크를 복사했어요 — 카톡에 붙여넣으면 바로 공유돼요");
      } catch {
        nativeShare();
      }
    }
  };

  const positive = result ? result.profit >= 0 : true;

  return (
    <Layout>
      <SEO
        title="내가 얼마나 못 벌었을까? — 후회 계산기"
        description="그때 그 종목 샀으면 지금 얼마? 종목과 날짜만 넣으면 놓친 수익을 계산해 드려요. 친구에게 공유도."
        path="/regret"
      />

      {/* 히어로 */}
      <section className="text-center max-w-2xl mx-auto mb-8 md:mb-10 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs font-medium mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          1초 후회 시뮬레이터
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
          내가 얼마나 <span className="text-rose-500">못 벌었을까?</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-3">
          그때 그 종목 샀으면 지금 얼마였을까. 종목이랑 날짜만 넣어보세요.
        </p>
      </section>

      {/* 입력 카드 */}
      <section className="max-w-xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">종목</label>
            <select
              value={stockId}
              onChange={(e) => setStockId(e.target.value)}
              className="mt-1 w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {!universe.length && <option>종목 불러오는 중…</option>}
              {universe.map((s) => (
                <option key={s.market + s.id} value={s.id}>
                  {s.name} ({s.ticker}) · {s.market}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">언제 들어갔다면?</label>
              <input
                type="date"
                value={entryDate}
                max={todayStr()}
                onChange={(e) => setEntryDate(e.target.value)}
                className="mt-1 w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">얼마 넣었다면?</label>
              <input
                type="number"
                value={amount}
                min={1000}
                step={10000}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1 w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {AMOUNT_CHIPS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  amount === a
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {wonKo(a)}
              </button>
            ))}
          </div>

          <button
            onClick={() => run()}
            disabled={loading || !stockId}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />}
            {loading ? "계산 중…" : "내 후회 계산하기"}
          </button>
          {error && <p className="text-xs text-rose-500 text-center">{error}</p>}
        </div>

        {/* 결과 카드 (공유용) */}
        {result && resultStock && (
          <div
            className={`mt-5 rounded-2xl p-6 md:p-7 border ${
              positive ? "border-rose-500/30 bg-rose-500/5" : "border-emerald-500/30 bg-emerald-500/5"
            }`}
          >
            <div className="text-sm text-muted-foreground">
              {result.adjusted && "※ 데이터 시작일로 보정 · "}
              {result.entryDate}에 <b className="text-foreground">{resultStock.name}</b>에{" "}
              {won(amount)} 넣었다면
            </div>

            <div className="mt-3 flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl md:text-4xl font-extrabold">{won(result.currentValue)}</span>
              <span
                className={`text-lg font-bold ${positive ? "text-rose-500" : "text-emerald-500"}`}
              >
                {pctStr(result.pct)}
              </span>
            </div>

            <div
              className={`mt-3 text-base md:text-lg font-bold ${
                positive ? "text-rose-500" : "text-emerald-500"
              }`}
            >
              {positive ? (
                <>😭 {wonKo(result.profit)} 못 벌었어요</>
              ) : (
                <>😮‍💨 안 사길 잘했네요 — 샀으면 {wonKo(Math.abs(result.profit))} 잃었을 뻔</>
              )}
            </div>

            {positive && result.maxProfit > result.profit && (
              <div className="mt-2 text-sm text-muted-foreground">
                🤯 보유 중 최고가({result.peakDate})에 팔았다면{" "}
                <b className="text-rose-500">{wonKo(result.maxProfit)}</b> ({pctStr(result.maxPct)})
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <Stat label="진입가" value={won(result.entryPrice)} />
              <Stat label="현재가" value={won(result.latestPrice)} />
              <Stat label="보유기간" value={`${result.days.toLocaleString()}일`} />
            </div>

            {/* 공유 */}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={shareKakao}
                className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#FEE500] text-[#191600] hover:brightness-95 transition"
              >
                <MessageCircle className="h-4 w-4" /> 카카오톡 공유
              </button>
              <button
                onClick={nativeShare}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-accent transition"
              >
                <Share2 className="h-4 w-4" /> 공유
              </button>
              <button
                onClick={copyLink}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-accent transition"
              >
                <Link2 className="h-4 w-4" /> 링크 복사
              </button>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              과거 데이터 기반 가정일 뿐, 투자 권유가 아니에요. 세금·배당·거래비용 미반영.
            </p>
          </div>
        )}
      </section>
    </Layout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/60 border border-border rounded-xl py-2.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold text-foreground mt-0.5">{value}</div>
    </div>
  );
}
