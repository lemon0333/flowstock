/**
 * /agent — 투자 에이전트 빌더 (MVP, 폼 기반)
 *
 * 흐름: 템플릿 고르기 → 조건 조정 → 라이브 미리보기 → install.sh 한 줄 다운로드 → 가이드
 * 노드 그래프(@xyflow/react) 업그레이드 + 미장 데이터는 다음 단계.
 *
 * 실거래는 우리 서버에서 안 함 — 생성물은 사용자 로컬 Claude Code 스킬. broker는 추상 stub.
 */

import { useEffect, useMemo, useState } from "react";
import { Bot, Download, Sparkles, FlaskConical, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { stockApi } from "@/services/api";
import {
  AGENT_TEMPLATES,
  screenStocks,
  type AgentConditions,
  type AgentStock,
  type AgentTemplate,
} from "@/lib/agent-templates";
import { buildBundle, type AgentSpec } from "@/lib/agent-export";

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "my-stock-agent";
}

/** 번들 파일들을 재생성하는 install.sh 한 장으로 합침 — "한 줄 다운로드" UX. */
function buildInstallScript(spec: AgentSpec): string {
  const files = buildBundle(spec);
  const lines: string[] = [
    "#!/bin/bash",
    "# FlowStock 에이전트 설치 스크립트 — 실행하면 ~/.claude/skills/에 스킬 폴더 생성.",
    "# 실거래 코드는 없음. 후보 추천까지 즉시 동작, 매매 연결은 README 참고.",
    "set -e",
    `DEST="$HOME/.claude/skills/${spec.slug}"`,
    'mkdir -p "$DEST"',
    'echo "설치 위치: $DEST"',
    "",
  ];
  for (const f of files) {
    const fname = f.path.split("/").pop() as string;
    const delim = "FLOWSTOCK_EOF";
    lines.push(`cat > "$DEST/${fname}" <<'${delim}'`);
    lines.push(f.content.replace(/\r/g, ""));
    lines.push(delim);
    lines.push("");
  }
  lines.push('echo "✅ 설치 완료. Claude Code에서 /' + spec.slug + ' 로 실행하세요."');
  lines.push("");
  return lines.join("\n");
}

export default function AgentBuilderPage() {
  const [stocks, setStocks] = useState<AgentStock[]>([]);
  const [loading, setLoading] = useState(true);

  const [templateId, setTemplateId] = useState<string>(AGENT_TEMPLATES[0].id);
  const [conditions, setConditions] = useState<AgentConditions>(AGENT_TEMPLATES[0].conditions);
  const [agentName, setAgentName] = useState<string>(AGENT_TEMPLATES[0].name);

  useEffect(() => {
    let alive = true;
    stockApi
      .getAll()
      .then((res) => {
        if (!alive) return;
        const arr = (res.data ?? []) as Array<Record<string, unknown>>;
        setStocks(
          arr.map((s) => ({
            id: String(s.id ?? s.ticker),
            ticker: String(s.ticker ?? s.id),
            name: String(s.name ?? ""),
            price: Number(s.price ?? s.close ?? 0),
            changePercent: Number(s.changePercent ?? 0),
            volume: Number(s.volume ?? 0),
          })),
        );
      })
      .catch(() => setStocks([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const pickTemplate = (t: AgentTemplate) => {
    setTemplateId(t.id);
    setConditions(t.conditions);
    setAgentName(t.name);
  };

  const preview = useMemo(() => screenStocks(stocks, conditions), [stocks, conditions]);
  const activeTemplate = AGENT_TEMPLATES.find((t) => t.id === templateId)!;

  const handleDownload = () => {
    const spec: AgentSpec = {
      name: agentName.trim() || "내 종목 에이전트",
      slug: slugify(agentName),
      rationale: activeTemplate.rationale,
      conditions,
    };
    const script = buildInstallScript(spec);
    const blob = new Blob([script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${spec.slug}-install.sh`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const upd = (patch: Partial<AgentConditions>) => setConditions((c) => ({ ...c, ...patch }));

  return (
    <Layout>
      <SEO
        title="투자 에이전트 빌더 — 노코드로 내 종목 봇 만들기"
        path="/agent"
        description="조건만 고르면 내 투자 요건에 맞는 종목을 찾아주는 Claude Code 스킬을 노코드로 생성. 다운로드해서 내 컴퓨터에서 실행."
      />
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            투자 에이전트 빌더
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            조건만 고르면 내 요건에 맞는 종목을 찾아주는 Claude Code 스킬이 만들어져요.
            다운받아서 내 컴퓨터에서 실행 — 실거래 연결은 본인 선택.
          </p>
        </div>

        {/* 1. 템플릿 */}
        <section>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" /> 1. 전략 고르기
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {AGENT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTemplate(t)}
                className={`text-left rounded-2xl border p-3 transition-colors ${
                  templateId === t.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className="text-lg">{t.emoji}</div>
                <div className="font-semibold text-sm mt-1">{t.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.tagline}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{activeTemplate.rationale}</p>
        </section>

        {/* 2. 조건 */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <FlaskConical className="h-4 w-4 text-primary" /> 2. 조건 조정
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Field label={`가격: ${conditions.minPrice.toLocaleString()} ~ ${conditions.maxPrice.toLocaleString()}원`}>
              <div className="flex gap-2">
                <input type="number" value={conditions.minPrice}
                  onChange={(e) => upd({ minPrice: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background" />
                <input type="number" value={conditions.maxPrice}
                  onChange={(e) => upd({ maxPrice: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background" />
              </div>
            </Field>
            <Field label={`등락률: ${conditions.minChangePercent}% ~ ${conditions.maxChangePercent}%`}>
              <div className="flex gap-2">
                <input type="number" value={conditions.minChangePercent}
                  onChange={(e) => upd({ minChangePercent: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background" />
                <input type="number" value={conditions.maxChangePercent}
                  onChange={(e) => upd({ maxChangePercent: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background" />
              </div>
            </Field>
            <Field label={`최소 거래량: ${conditions.minVolume.toLocaleString()}주`}>
              <input type="range" min={0} max={10_000_000} step={100_000} value={conditions.minVolume}
                onChange={(e) => upd({ minVolume: Number(e.target.value) })}
                className="w-full accent-primary" />
            </Field>
            <Field label={`정렬 & 개수`}>
              <div className="flex gap-2">
                <select value={conditions.sortKey}
                  onChange={(e) => upd({ sortKey: e.target.value as AgentConditions["sortKey"] })}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background">
                  <option value="volume">거래량</option>
                  <option value="changePercent">등락률</option>
                  <option value="price">가격</option>
                </select>
                <select value={conditions.sortDesc ? "desc" : "asc"}
                  onChange={(e) => upd({ sortDesc: e.target.value === "desc" })}
                  className="px-3 py-2 rounded-lg border border-border bg-background">
                  <option value="desc">높은순</option>
                  <option value="asc">낮은순</option>
                </select>
                <select value={conditions.topN}
                  onChange={(e) => upd({ topN: Number(e.target.value) })}
                  className="px-3 py-2 rounded-lg border border-border bg-background">
                  {[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n}개</option>)}
                </select>
              </div>
            </Field>
          </div>
        </section>

        {/* 3. 미리보기 */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">3. 미리보기 — 지금 이 조건이면 이 종목들</h2>
            <span className="text-xs text-muted-foreground">{preview.length}개</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">시세 불러오는 중…</div>
          ) : preview.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              조건에 맞는 종목이 없어요. 범위를 넓혀보세요.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left py-2 px-4">종목</th>
                    <th className="text-right py-2 px-4">현재가</th>
                    <th className="text-right py-2 px-4">등락률</th>
                    <th className="text-right py-2 px-4">거래량</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-2 px-4">
                        <span className="font-semibold">{s.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{s.ticker}</span>
                      </td>
                      <td className="py-2 px-4 text-right font-data">{s.price.toLocaleString()}원</td>
                      <td className={`py-2 px-4 text-right font-data font-medium ${
                        s.changePercent > 0 ? "text-positive" : s.changePercent < 0 ? "text-negative" : "text-muted-foreground"
                      }`}>
                        {s.changePercent > 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
                      </td>
                      <td className="py-2 px-4 text-right font-data text-muted-foreground">{s.volume.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 4. 내보내기 */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Download className="h-4 w-4 text-primary" /> 4. 내 에이전트로 내보내기
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <label className="flex-1">
              <div className="text-xs text-muted-foreground mb-1">에이전트 이름</div>
              <input value={agentName} onChange={(e) => setAgentName(e.target.value)}
                placeholder="예: 거래량 모멘텀 봇"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </label>
            <button type="button" onClick={handleDownload}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              <Download className="h-4 w-4" /> install.sh 다운로드
            </button>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed bg-muted/40 rounded-xl p-3 space-y-1">
            <p className="font-medium text-foreground">설치 (한 줄):</p>
            <code className="block font-mono text-[12px]">sh ~/Downloads/{slugify(agentName)}-install.sh</code>
            <p className="mt-2">
              실행하면 <code className="font-mono">~/.claude/skills/{slugify(agentName)}/</code>에 스킬이 깔려요.
              Claude Code에서 <code className="font-mono">/{slugify(agentName)}</code>로 실행 → 후보 추천.
            </p>
            <p className="mt-1">
              ⚠️ 실거래 연결은 안 돼있어요(안전). 매수/매도까지 하려면 번들 안 README대로 본인 증권사 wrapper를 연결하세요.
              FlowStock은 자격증명을 보관하지도 매매하지도 않아요.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
