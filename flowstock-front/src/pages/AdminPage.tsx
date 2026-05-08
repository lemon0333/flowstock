/**
 * /admin — 관리자 대시보드
 *
 * 권한: Member.role == ADMIN인 사용자만 (백엔드 AdminChecker가 차단).
 * 권한 없는 진입은 403 응답 → 안내 메시지.
 */

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, Users, MessageSquare, Newspaper, TrendingUp, ShieldCheck, Shield } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { adminApi, type AdminStats, type MemberSummary, type UserRole } from "@/services/api";
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
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grantingId, setGrantingId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [statsRes, membersRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.listMembers(0, 50),
        ]);
        if (!alive) return;
        setStats(statsRes.data ?? null);
        setMembers(membersRes.data ?? []);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : String(e);
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

  const toggleRole = async (member: MemberSummary) => {
    const next: UserRole = member.role === "ADMIN" ? "USER" : "ADMIN";
    setGrantingId(member.memberId);
    try {
      const res = await adminApi.grantRole(member.memberId, next);
      const updated = res.data;
      if (updated) {
        setMembers((prev) =>
          prev.map((m) => (m.memberId === member.memberId ? { ...m, role: updated.role } : m)),
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`권한 변경 실패: ${msg}`);
    } finally {
      setGrantingId(null);
    }
  };

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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              회원 권한 관리 (최근 가입 50명)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">닉네임</th>
                    <th className="text-left px-4 py-2 font-medium">이메일</th>
                    <th className="text-left px-4 py-2 font-medium hidden md:table-cell">가입</th>
                    <th className="text-left px-4 py-2 font-medium">권한</th>
                    <th className="text-right px-4 py-2 font-medium">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.memberId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium truncate max-w-[140px]">{m.nickname}</td>
                      <td className="px-4 py-2 truncate max-w-[200px] text-muted-foreground">
                        {m.email}
                      </td>
                      <td className="px-4 py-2 hidden md:table-cell text-xs text-muted-foreground">
                        {m.provider ?? "-"} · {new Date(m.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                            m.role === "ADMIN"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {m.role === "ADMIN" ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <Shield className="h-3 w-3" />
                          )}
                          {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          disabled={grantingId === m.memberId}
                          onClick={() => toggleRole(m)}
                          className="text-xs px-3 py-1 rounded-md border hover:bg-muted transition disabled:opacity-50"
                        >
                          {grantingId === m.memberId
                            ? "..."
                            : m.role === "ADMIN"
                              ? "USER로"
                              : "ADMIN으로"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
