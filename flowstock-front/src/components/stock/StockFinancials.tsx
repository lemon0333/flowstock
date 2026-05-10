/**
 * ============================================================
 * 종목 재무제표 / 밸류에이션 (DART 기반, key 없으면 mock)
 * - 매출/영업이익/순이익 시계열
 * - 사업부별 매출 구성 (도넛)
 * - PER/PBR 시계열
 * - Simplified DCF 계산기
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dartApi, type FinancialResponse } from "@/services/api";

interface Props {
  ticker: string;
  price: number;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#A855F7", "#EF4444", "#06B6D4", "#84CC16"];

export default function StockFinancials({ ticker, price }: Props) {
  const [data, setData] = useState<FinancialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── DCF 입력 (사용자 조정 가능) ──
  const [growthRate, setGrowthRate] = useState(0.05); // 5% 성장
  const [discountRate, setDiscountRate] = useState(0.1); // 10% WACC
  const [terminalGrowth, setTerminalGrowth] = useState(0.02); // 영구성장 2%

  useEffect(() => {
    if (!ticker) return;
    let alive = true;
    setLoading(true);
    setError("");

    dartApi
      .getFinancials(ticker)
      .then((res) => {
        if (!alive) return;
        setData(res.data ?? null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "재무 데이터를 불러오지 못했습니다.");
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [ticker]);

  // ── 차트용 시계열 가공 ──
  const fsBars = useMemo(() => {
    if (!data?.statements) return [];
    return data.statements.map((s) => ({
      year: s.year,
      매출: s.revenue / 1e8,
      영업이익: s.operatingProfit / 1e8,
      순이익: s.netIncome / 1e8,
    }));
  }, [data]);

  const valuationLines = useMemo(() => {
    if (!data?.valuation) return [];
    return data.valuation.map((v) => ({
      year: v.year,
      PER: v.per,
      PBR: v.pbr,
    }));
  }, [data]);

  const segmentPie = useMemo(() => {
    if (!data?.segments) return [];
    return data.segments.map((s, i) => ({
      name: s.name,
      value: s.revenue,
      color: COLORS[i % COLORS.length],
    }));
  }, [data]);

  // ── DCF 계산 (5년 자유현금흐름 + Terminal value) ──
  const dcf = useMemo(() => {
    if (!data?.statements?.length) return null;
    // 가장 최근 영업이익을 FCF proxy로 (세후 80%)
    const latest = data.statements[data.statements.length - 1];
    const baseFcf = latest.operatingProfit * 0.8;
    if (baseFcf <= 0) return null;

    let pvSum = 0;
    const projections: { year: number; fcf: number; pv: number }[] = [];
    for (let t = 1; t <= 5; t++) {
      const fcf = baseFcf * Math.pow(1 + growthRate, t);
      const pv = fcf / Math.pow(1 + discountRate, t);
      pvSum += pv;
      projections.push({ year: latest.year + t, fcf, pv });
    }
    // Terminal value at year 5
    const terminalFcf = baseFcf * Math.pow(1 + growthRate, 5) * (1 + terminalGrowth);
    const terminal = terminalFcf / (discountRate - terminalGrowth);
    const pvTerminal = terminal / Math.pow(1 + discountRate, 5);

    const enterpriseValue = pvSum + pvTerminal;
    // 발행주식수: data.sharesOutstanding 또는 추정
    const shares = data.sharesOutstanding ?? 0;
    const fairValue = shares > 0 ? enterpriseValue / shares : null;
    const upside = fairValue !== null && price > 0 ? ((fairValue - price) / price) * 100 : null;

    return {
      baseFcf,
      projections,
      terminal: pvTerminal,
      enterpriseValue,
      fairValue,
      upside,
    };
  }, [data, growthRate, discountRate, terminalGrowth, price]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted-foreground">
        재무 데이터 불러오는 중…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted-foreground">
        {error || "재무 데이터가 아직 없어요."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.source === "mock" && (
        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 rounded-lg px-3 py-2">
          ⚠️ DART_API_KEY가 설정되지 않아 샘플 데이터입니다. 키를 등록하면 실제 공시 재무가 표시됩니다.
        </div>
      )}

      {/* 손익 시계열 */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-3">매출 / 영업이익 / 순이익 (단위: 억원)</h3>
        {fsBars.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={fsBars}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${Math.round(v).toLocaleString()}억`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="매출" fill="#3B82F6" />
              <Bar dataKey="영업이익" fill="#10B981" />
              <Bar dataKey="순이익" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-xs text-muted-foreground py-6 text-center">데이터 없음</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 사업부 매출 */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-3">사업부별 매출 비중</h3>
          {segmentPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={segmentPie}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label={(e) => `${e.name}`}
                >
                  {segmentPie.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${(v / 1e8).toLocaleString()}억`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-muted-foreground py-6 text-center">데이터 없음</div>
          )}
        </div>

        {/* PER / PBR */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-3">PER / PBR 추이</h3>
          {valuationLines.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={valuationLines}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v?.toFixed(2)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="PER" stroke="#3B82F6" dot strokeWidth={2} />
                <Line type="monotone" dataKey="PBR" stroke="#F59E0B" dot strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-muted-foreground py-6 text-center">데이터 없음</div>
          )}
        </div>
      </div>

      {/* DCF */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-3">Simplified DCF (5년 + Terminal value)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Slider
            label={`성장률 g = ${(growthRate * 100).toFixed(1)}%`}
            value={growthRate}
            min={-0.05}
            max={0.2}
            step={0.005}
            onChange={setGrowthRate}
          />
          <Slider
            label={`할인율 r = ${(discountRate * 100).toFixed(1)}%`}
            value={discountRate}
            min={0.04}
            max={0.2}
            step={0.005}
            onChange={setDiscountRate}
          />
          <Slider
            label={`영구성장 g∞ = ${(terminalGrowth * 100).toFixed(1)}%`}
            value={terminalGrowth}
            min={0}
            max={0.05}
            step={0.005}
            onChange={setTerminalGrowth}
          />
        </div>
        {dcf ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Cell2 label="기준 FCF" value={`${(dcf.baseFcf / 1e8).toFixed(0)} 억`} />
            <Cell2
              label="기업가치(EV)"
              value={`${(dcf.enterpriseValue / 1e8).toFixed(0)} 억`}
            />
            <Cell2
              label="적정주가"
              value={dcf.fairValue !== null ? `${Math.round(dcf.fairValue).toLocaleString()}원` : "-"}
              hint="EV / 발행주식수"
            />
            <Cell2
              label="현재가 대비"
              value={dcf.upside !== null ? `${dcf.upside >= 0 ? "+" : ""}${dcf.upside.toFixed(1)}%` : "-"}
              tone={dcf.upside !== null && dcf.upside >= 0 ? "positive" : "negative"}
            />
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            영업이익이 음수여서 DCF 계산이 불가합니다.
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-3">
          * 단순화 모델 — 실제 투자판단에는 설비투자/운전자본 변화, 베타, 자본구조 등 추가 고려 필요.
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      <div className="mb-1">{label}</div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}

function Cell2({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
}) {
  const cls =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-data font-bold mt-0.5 ${cls}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
