/**
 * ============================================================
 * 뉴스 ↔ 뉴스 ↔ 종목 관계 네트워크 그래프
 * - ReactFlow (@xyflow/react) 기반
 * - 뉴스 → 종목: 영향도 색상 엣지 (한국 컨벤션: 빨강=상승, 파랑=하락)
 * - 뉴스 ↔ 뉴스: 공유 종목 + 공유 키워드 가중치로 보라색 점선 엣지
 *   (같은 주제 / 같은 사건 / 동일 산업군 클러스터링)
 * ============================================================
 */

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface NewsItem {
  id: string;
  title: string;
  relatedStocks: string[];
  keywords?: string[];
  impact: "positive" | "negative" | "neutral";
}

interface StockItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface Props {
  newsItems: NewsItem[];
  stocks?: StockItem[];
  height?: number;
}

/* ── 커스텀 노드: 뉴스 ── */
function NewsNode({ data }: { data: { label: string; impact: string } }) {
  const borderColor =
    data.impact === "positive" ? "border-positive" :
    data.impact === "negative" ? "border-negative" :
    "border-muted-foreground/30";

  return (
    <div className={`bg-card border-2 ${borderColor} rounded-2xl px-4 py-3 max-w-[220px]`} style={{ boxShadow: 'var(--shadow-elevated)' }}>
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />
      <p className="text-[10px] text-muted-foreground mb-1 font-medium">뉴스</p>
      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{data.label}</p>
    </div>
  );
}

/* ── 커스텀 노드: 기업 ── */
function StockNode({ data }: { data: { label: string; ticker: string } }) {
  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3 text-center" style={{ boxShadow: 'var(--shadow-elevated)' }}>
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />
      <p className="font-data text-xs text-primary font-bold">{data.ticker}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{data.label}</p>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  newsNode: NewsNode,
  stockNode: StockNode,
};

/** 두 뉴스의 관계 점수 (공유 종목 2점, 공유 키워드 1점). 임계값 ≥ 2 이면 엣지. */
function relationScore(a: NewsItem, b: NewsItem): { score: number; sharedStocks: number; sharedKw: number } {
  const aStocks = new Set(a.relatedStocks || []);
  const aKws = new Set(a.keywords || []);
  let sharedStocks = 0;
  let sharedKw = 0;
  (b.relatedStocks || []).forEach((s) => { if (aStocks.has(s)) sharedStocks += 1; });
  (b.keywords || []).forEach((k) => { if (aKws.has(k)) sharedKw += 1; });
  return { score: sharedStocks * 2 + sharedKw, sharedStocks, sharedKw };
}

export default function NetworkGraph({ newsItems, stocks = [], height = 400 }: Props) {
  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = [];
    const edgeList: Edge[] = [];
    const addedStocks = new Set<string>();

    // 1) 뉴스 노드 + 뉴스→종목 엣지
    newsItems.forEach((item, i) => {
      nodeList.push({
        id: item.id,
        type: "newsNode",
        position: { x: 50, y: i * 130 + 30 },
        data: { label: item.title, impact: item.impact },
      });

      (item.relatedStocks || []).forEach((stockId) => {
        const stock = stocks.find((s) => s.id === stockId);
        if (!stock) return;

        if (!addedStocks.has(stockId)) {
          addedStocks.add(stockId);
          nodeList.push({
            id: stockId,
            type: "stockNode",
            position: { x: 480, y: Array.from(addedStocks).indexOf(stockId) * 90 + 30 },
            data: { label: stock.name, ticker: stock.id },
          });
        }

        edgeList.push({
          id: `${item.id}-${stockId}`,
          source: item.id,
          target: stockId,
          animated: true,
          style: {
            stroke:
              item.impact === "positive" ? "hsl(355, 80%, 56%)" :
              item.impact === "negative" ? "hsl(217, 78%, 50%)" :
              "hsl(220, 9%, 76%)",
            strokeWidth: 2,
          },
        });
      });
    });

    // 2) 뉴스 ↔ 뉴스 엣지 (공유 종목/키워드 기반)
    for (let i = 0; i < newsItems.length; i++) {
      for (let j = i + 1; j < newsItems.length; j++) {
        const rel = relationScore(newsItems[i], newsItems[j]);
        if (rel.score < 2) continue;
        edgeList.push({
          id: `rel-${newsItems[i].id}-${newsItems[j].id}`,
          source: newsItems[i].id,
          target: newsItems[j].id,
          // 같은 column 안 뉴스끼리라 floating 곡선이 자연스러움
          type: "default",
          animated: false,
          style: {
            stroke: "hsl(262, 70%, 60%)",          // 보라 — 뉴스간 관계
            strokeWidth: 1 + Math.min(rel.score, 4),
            strokeDasharray: "5 5",
            opacity: 0.7,
          },
          label: `${rel.sharedStocks > 0 ? `📰 종목 ${rel.sharedStocks}` : ""}${rel.sharedStocks > 0 && rel.sharedKw > 0 ? " · " : ""}${rel.sharedKw > 0 ? `🔑 ${rel.sharedKw}` : ""}`,
          labelStyle: { fontSize: 10, fill: "hsl(262, 70%, 45%)", fontWeight: 600 },
          labelBgStyle: { fill: "hsl(0, 0%, 100%)", fillOpacity: 0.9 },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
        });
      }
    }

    return { nodes: nodeList, edges: edgeList };
  }, [newsItems, stocks]);

  const onInit = useCallback(() => {}, []);

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: "#ffffff" }}
      >
        <Background color="hsl(220, 13%, 91%)" gap={20} size={1} />
        <Controls
          showZoom
          showFitView
          showInteractive={false}
          className="!bg-card !border-border !rounded-xl !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button]:!rounded-lg [&>button:hover]:!bg-accent"
        />
      </ReactFlow>
    </div>
  );
}
