/**
 * /admin — 관리자 대시보드
 *
 * 권한: Member.role == ADMIN인 사용자만 (백엔드 AdminChecker가 차단).
 * 권한 없는 진입은 403 응답 → 안내 메시지.
 */

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, Users, MessageSquare, Newspaper, TrendingUp } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { adminApi, type AdminStats } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatKrw(value: number): string {
  if (Math.abs(value) >= 1_0000_0000) return `${(value / 1_0000_0000).toFixed(2)}억`;
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}만`;
  return value.toLocaleString();
}

function StatCard({
  icon: Icon,
  label,
  total,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  total: number;
  delta?: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums">{total.toLocaleString()}</p>
        {delta !== undefined && (
          <p className="text-xs mt-1">
            <span
              className={
                delta > 0
                  ? "text-emerald-600 font-medium"
                  : "text-muted-foreground"
              }
            >
              +{delta.toLocaleString()} (24h)
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await adminApi.getStats();
        if (alive) setStats(res.data ?? null);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : String(e);
        // 403 / FORBIDDEN / ACCESS_DENIED → 권한 없음 화면
        if (/403|FORBIDDEN|ACCESS_DENIED|AUTH_004/i.test(msg)) {
          setDenied(true);
        } else {
          setError(msg);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (denied) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-20 text-center space-y-3">
          <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold">관리자 전용 페이지</h1>
          <p className="text-sm text-muted-foreground">
            이 페이지는 관리자(ADMIN role) 계정만 접근할 수 있습니다.
          </p>
        </div>
      </Layout>
    );
  }

  if (error || !stats) {
    return (
      <Layout>
        <p className="text-sm text-destructive py-12 text-center">
          {error ?? "통계를 불러올 수 없습니다."}
        </p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-1">
            기준 시각: {new Date(stats.generatedAt).toLocaleString("ko-KR")}
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="회원"
            total={stats.members.total}
            delta={stats.members.last24h}
          />
          <StatCard
            icon={TrendingUp}
            label="거래 기록"
            total={stats.trades.total}
            delta={stats.trades.last24h}
          />
          <StatCard
            icon={Newspaper}
            label="커뮤니티 글"
            total={stats.articles.total}
            delta={stats.articles.last24h}
          />
          <StatCard
            icon={MessageSquare}
            label="댓글"
            total={stats.comments.total}
            delta={stats.comments.last24h}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">공개 거래</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground">공개로 표시된 거래 수</p>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {stats.publicTrades.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">실현손익 누적 (공개 매도 기준)</p>
              <p
                className={`text-2xl font-bold tabular-nums mt-1 ${
                  stats.totalRealizedPnl >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {stats.totalRealizedPnl >= 0 ? "+" : ""}
                {formatKrw(stats.totalRealizedPnl)}원
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
