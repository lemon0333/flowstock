/**
 * ============================================================
 * 실적 캘린더 (/earnings)
 * - 분기별 실적 발표 일정 (DART)
 * - 키 없으면 mock
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { dartApi, type EarningsEvent } from "@/services/api";

export default function EarningsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    dartApi
      .getEarningsCalendar(year, quarter)
      .then((res) => alive && setEvents(res.data ?? []))
      .catch(() => setEvents([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [year, quarter]);

  // 날짜별 그룹
  const grouped = useMemo(() => {
    const map: Record<string, EarningsEvent[]> = {};
    events.forEach((e) => {
      (map[e.date] ??= []).push(e);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            실적 발표 캘린더
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            분기별 잠정/확정 실적 발표 일정 (DART 공시 기반)
          </p>
        </div>

        <section className="flex flex-wrap gap-2">
          {[year - 1, year, year + 1].map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                y === year ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"
              }`}
            >
              {y}년
            </button>
          ))}
          <span className="w-2" />
          {[1, 2, 3, 4].map((q) => (
            <button
              key={q}
              onClick={() => setQuarter(q)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                q === quarter ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"
              }`}
            >
              {q}Q
            </button>
          ))}
        </section>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">로드 중…</div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            표시할 일정이 없습니다.
          </div>
        ) : (
          <section className="space-y-3">
            {grouped.map(([date, list]) => (
              <div key={date} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-muted/40 text-sm font-semibold flex items-center justify-between">
                  <span>{date}</span>
                  <span className="text-xs text-muted-foreground">{list.length}건</span>
                </div>
                <div className="divide-y divide-border">
                  {list.map((e, i) => (
                    <Link
                      key={i}
                      to={`/stock/${e.ticker}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-accent/40 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{e.name}</span>
                        <span className="text-xs text-muted-foreground">{e.ticker}</span>
                        <span className="text-xs text-muted-foreground">{e.quarter}</span>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          e.type === "확정실적"
                            ? "bg-positive/10 text-positive"
                            : e.type === "잠정실적"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {e.type}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </Layout>
  );
}
