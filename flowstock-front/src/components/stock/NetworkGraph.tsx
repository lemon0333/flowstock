/**
 * ============================================================
 * 뉴스-기업 관계 네트워크 그래프 컴포넌트
 * - ReactFlow (@xyflow/react) 기반
 * - 토스 스타일: 흰 배경 + 부드러운 노드
 * - 영향도(positive/negative)에 따라 엣지 색상 구분
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
import { stocks } from "@/mocks/data";

/** 뉴스 데이터 타입 */
interface NewsItem {
  id: string;
  title: string;
  relatedStocks: string[];
  impact: "positive" | "negative" | "neutral";
}

interface Props {
  newsItems: NewsItem[];
  height?: number;
}

/* ── 커스텀 노드: 뉴스 ── */
function NewsNode({ data }: { data: { label: string; impact: string } }) {
  const borderColor =
    data.impact === "positive" ? "border-positive" :
    data.impact === "negative" ? "border-negative" :
    "border-muted-foreground/30";

  return (
    <div className={`bg-card border-2 ${borderColor} rounded-2xl px-4 py-3 max-w-[200px]`} style={{ boxShadow: 'var(--shadow-elevated)' }}>
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
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

/** 커스텀 노드 타입 등록 */
const nodeTypes: NodeTypes = {
  newsNode: NewsNode,
  stockNode: StockNode,
};

export default function NetworkGraph({ newsItems, height = 400 }: Props) {
  /** 노드/엣지 데이터 생성 */
  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = [];
    const edgeList: Edge[] = [];
    const addedStocks = new Set<string>();

    newsItems.forEach((item, i) => {
      nodeList.push({
        id: item.id,
        type: "newsNode",
        position: { x: 50, y: i * 120 + 30 },
        data: { label: item.title, impact: item.impact },
      });

      item.relatedStocks.forEach((stockId) => {
        const stock = stocks.find((s) => s.id === stockId);
        if (!stock) return;

        if (!addedStocks.has(stockId)) {
          addedStocks.add(stockId);
          nodeList.push({
            id: stockId,
            type: "stockNode",
            position: { x: 400, y: Array.from(addedStocks).indexOf(stockId) * 80 + 30 },
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
              item.impact === "positive" ? "hsl(142, 71%, 45%)" :
              item.impact === "negative" ? "hsl(0, 84%, 60%)" :
              "hsl(220, 9%, 76%)",
            strokeWidth: 2,
          },
        });
      });
    });

    return { nodes: nodeList, edges: edgeList };
  }, [newsItems]);

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
