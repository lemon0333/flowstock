/**
 * ============================================================
 * 관심 종목 알림 (/alerts)
 * - 종목 + 임계 등락률 등록 → 1분 polling으로 현재가 확인
 * - 임계 넘으면 브라우저 Notification으로 알림
 * - localStorage persist
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Plus, Trash2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useStore, type WatchlistItem } from "@/stores/useStore";
import { stockApi } from "@/services/api";

interface StockRow {
  id: string;
  ticker?: string;
  name: string;
  price: number;
  changePercent?: number;
}

export default function AlertsPage() {
  const { watchlist, addWatch, removeWatch, updateWatch } = useStore();
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [showForm, setShowForm] = useState(false);
  const [formTicker, setFormTicker] = useState("");
  const [formThreshold, setFormThreshold] = useState("3");

  const stockMap = useMemo(() => {
    const m: Record<string, StockRow> = {};
    stocks.forEach((s) => {
      m[s.id] = s;
      if (s.ticker) m[s.ticker] = s;
    });
    return m;
  }, [stocks]);

  // 1분 polling
  useEffect(() => {
    let mounted = true;
    const fetchOnce = async () => {
      try {
        const res = await stockApi.getAll();
        if (!mounted) return;
        const list = (res.data ?? []) as StockRow[];
        setStocks(list);

        // 임계 검사
        const map: Record<string, StockRow> = {};
        list.forEach((s) => {
          map[s.id] = s;
          if (s.ticker) map[s.ticker] = s;
        });
        for (const w of watchlist) {
          const s = map[w.ticker];
          if (!s) continue;
          const change = ((s.price - w.basePrice) / w.basePrice) * 100;
          if (Math.abs(change) >= w.threshold) {
            // 동일 종목 5분 이내 중복 알림 방지
            const last = w.lastNotifiedAt ? new Date(w.lastNotifiedAt).getTime() : 0;
            if (Date.now() - last < 5 * 60 * 1000) continue;
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(`${w.name} ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`, {
                body: `현재가 ${s.price.toLocaleString()}원 (기준 ${w.basePrice.toLocaleString()})`,
                icon: "/favicon.svg",
              });
            }
            updateWatch(w.ticker, { lastNotifiedAt: new Date().toISOString() });
          }
        }
      } catch {
        // ignore
      }
    };
    fetchOnce();
    const t = setInterval(fetchOnce, 60_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [watchlist, updateWatch]);

  const requestPerm = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
  };

  const handleAdd = () => {
    if (!formTicker) return;
    const s = stockMap[formTicker];
    if (!s) return;
    addWatch({
      ticker: s.ticker || s.id,
      name: s.name,
      basePrice: s.price,
      threshold: Math.max(0.5, Number(formThreshold) || 3),
    });
    setFormTicker("");
    setFormThreshold("3");
    setShowForm(false);
  };

  const renderRow = (w: WatchlistItem) => {
    const cur = stockMap[w.ticker];
    const change = cur ? ((cur.price - w.basePrice) / w.basePrice) * 100 : 0;
    const triggered = cur && Math.abs(change) >= w.threshold;
    return (
      <div
        key={w.ticker}
        className="flex items-center justify-between px-5 py-3 border-b border-border/40 last:border-0"
      >
        <div>
          <div className="text-sm font-semibold">{w.name} <span className="text-xs text-muted-foreground">{w.ticker}</span></div>
          <div className="text-xs text-muted-foreground mt-0.5">
            기준 {w.basePrice.toLocaleString()}원 · 임계 ±{w.threshold}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-data">
            {cur ? `${cur.price.toLocaleString()}원` : "-"}
          </div>
          <div className={`text-xs font-data ${triggered ? "font-bold" : ""} ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
            {cur ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : ""}
            {triggered && " 🔔"}
          </div>
        </div>
        <button
          onClick={() => removeWatch(w.ticker)}
          className="ml-3 p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-accent"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">관심 종목 알림</h1>
          <p className="text-sm text-muted-foreground mt-1">
            등록 시점 가격 대비 ±임계% 변동되면 브라우저 알림 — 1분마다 시세 확인
          </p>
        </div>

        {/* 권한 안내 */}
        {perm !== "granted" && (
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {perm === "denied" ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              <span className="text-sm">
                {perm === "denied"
                  ? "브라우저 알림이 차단됨 — 사이트 설정에서 허용해야 알림이 옵니다."
                  : "알림을 받으려면 브라우저 권한 허용이 필요합니다."}
              </span>
            </div>
            {perm !== "denied" && (
              <button
                onClick={requestPerm}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
              >
                권한 허용
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-full"
        >
          <Plus className="h-4 w-4" /> 종목 추가
        </button>

        {showForm && (
          <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">종목</label>
              <select
                value={formTicker}
                onChange={(e) => setFormTicker(e.target.value)}
                className="w-full bg-accent border border-border rounded-xl px-3 py-2.5 text-sm"
              >
                <option value="">선택</option>
                {stocks.slice(0, 100).map((s) => (
                  <option key={s.id} value={s.ticker || s.id}>
                    {s.name} ({s.price.toLocaleString()}원)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">임계 (±%)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={formThreshold}
                onChange={(e) => setFormThreshold(e.target.value)}
                className="w-full bg-accent border border-border rounded-xl px-3 py-2.5 text-sm font-data"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAdd}
                className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90"
              >
                등록
              </button>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-sm font-semibold">
            관심 종목 ({watchlist.length})
          </div>
          {watchlist.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              아직 등록된 관심 종목이 없습니다
            </div>
          ) : (
            <div>{watchlist.map(renderRow)}</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
