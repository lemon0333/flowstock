/**
 * ============================================================
 * 마이페이지 (/me)
 * - 회원 정보 (이름, 이메일, 가입 경로, 가입일)
 * - 모의투자 요약 (Zustand에 저장된 잔고/수익률)
 * - 알림 설정 / 로그아웃
 * - 네이버/Google OAuth 검수 시 "이메일·이름 활용처" 스크린샷 대상
 * ============================================================
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, User as UserIcon, LogOut, Briefcase, Bell, ShieldCheck, Calendar, Pencil, Check, X, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { authApi } from "@/services/api";
import { useStore } from "@/stores/useStore";

interface MeResponse {
  id?: number | string;
  email?: string;
  nickname?: string;
  name?: string;
  provider?: string;
  profileImageUrl?: string;
  createdAt?: string;
  isProfileCompleted?: boolean;
}

const PROVIDER_LABEL: Record<string, string> = {
  GOOGLE: "Google",
  NAVER: "Naver",
  google: "Google",
  naver: "Naver",
};

export default function MePage() {
  const { user, holdings, cash, logout } = useStore();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 닉네임 인라인 편집
  const [editing, setEditing] = useState(false);
  const [draftNickname, setDraftNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    let alive = true;
    authApi
      .getMe()
      .then((res) => {
        if (!alive) return;
        setMe((res.data ?? null) as MeResponse | null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "프로필을 불러오지 못했습니다.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // ── 모의투자 요약 ──
  const totalEvaluation = holdings.reduce((acc, h) => acc + h.quantity * h.avgPrice, 0);
  const totalAssets = (cash ?? 0) + totalEvaluation;
  const initialAssets = 10_000_000; // Zustand 초기값
  const totalReturn = initialAssets > 0 ? ((totalAssets - initialAssets) / initialAssets) * 100 : 0;

  // 표시 우선순위: backend /me → Zustand user
  const displayName = me?.nickname || me?.name || user?.name || "사용자";
  const displayEmail = me?.email || user?.email || "(이메일 정보 없음)";
  const provider = me?.provider ? PROVIDER_LABEL[me.provider] ?? me.provider : "-";
  const joinedAt = me?.createdAt ? new Date(me.createdAt).toLocaleDateString("ko-KR") : "-";

  const startEdit = () => {
    setDraftNickname(me?.nickname ?? "");
    setEditError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditError("");
  };

  const saveNickname = async () => {
    const v = draftNickname.trim();
    if (v.length < 1 || v.length > 50) {
      setEditError("닉네임은 1~50자");
      return;
    }
    if (v === me?.nickname) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      const res = await authApi.updateProfile({ nickname: v });
      const updated = res.data;
      if (updated) {
        setMe((prev) =>
          prev
            ? { ...prev, nickname: updated.nickname, isProfileCompleted: updated.isProfileCompleted }
            : { nickname: updated.nickname, isProfileCompleted: updated.isProfileCompleted, email: updated.email }
        );
      }
      setEditing(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">마이페이지</h1>
          <p className="text-sm text-muted-foreground mt-1">
            계정 정보와 모의투자 현황
          </p>
        </div>

        {loading && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
            불러오는 중…
          </div>
        )}

        {error && (
          <div className="bg-card border border-border rounded-2xl p-6 text-sm">
            <p className="text-negative">{error}</p>
            <p className="text-xs text-muted-foreground mt-2">
              로그인 세션이 만료됐을 수 있습니다.{" "}
              <Link to="/login" className="text-primary hover:underline">다시 로그인</Link>.
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── 프로필 카드 ── */}
            <section
              className="bg-card border border-border rounded-2xl p-6"
              style={{ boxShadow: "var(--shadow-card)" }}
              aria-label="회원 정보"
            >
              <div className="flex items-start gap-4">
                {me?.profileImageUrl ? (
                  <img
                    src={me.profileImageUrl}
                    alt={displayName}
                    className="w-16 h-16 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {displayName.slice(0, 1)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {editing ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                          type="text"
                          value={draftNickname}
                          onChange={(e) => setDraftNickname(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveNickname();
                            else if (e.key === "Escape") cancelEdit();
                          }}
                          maxLength={50}
                          autoFocus
                          disabled={saving}
                          className="flex-1 min-w-0 px-2 py-1 text-base font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <button
                          type="button"
                          onClick={saveNickname}
                          disabled={saving}
                          title="저장"
                          className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={saving}
                          title="취소"
                          className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-lg font-bold">{displayName}</h2>
                        <button
                          type="button"
                          onClick={startEdit}
                          title="닉네임 수정"
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {provider !== "-" && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                            {provider}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {editError && (
                    <p className="text-xs text-destructive mt-1.5">{editError}</p>
                  )}
                  {!editing && me && !me.isProfileCompleted && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                      💡 닉네임을 수정하지 않으면 게시글에서 이메일 앞 3자만 노출돼요 (예: <span className="font-mono">{(me.email || "").split("@")[0]?.slice(0, 3)}***</span>).
                      위 ✏️ 눌러서 본인 닉네임으로 바꾸면 그대로 표시.
                    </p>
                  )}

                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <dt className="sr-only">이름</dt>
                      <dd className="text-foreground">{displayName}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <dt className="sr-only">이메일</dt>
                      <dd className="text-foreground break-all">{displayEmail}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <dt className="sr-only">가입일</dt>
                      <dd className="text-muted-foreground">가입 {joinedAt}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-border text-[11px] text-muted-foreground leading-relaxed">
                <ShieldCheck className="h-3 w-3 inline-block mr-1 align-text-bottom" />
                이메일과 이름은 로그인 식별 및 본 페이지에서의 사용자 표시 목적으로만 사용됩니다.
                자세한 내용은 <Link to="/privacy" className="text-primary hover:underline">개인정보처리방침</Link> 참조.
              </div>
            </section>

            {/* ── 모의투자 요약 ── */}
            <section className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> 모의투자 현황
                </h3>
                <Link
                  to="/portfolio"
                  className="text-xs text-primary hover:underline"
                >
                  자세히 →
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="총 자산" value={`${Math.round(totalAssets).toLocaleString()}원`} />
                <Stat label="현금 잔고" value={`${Math.round(cash ?? 0).toLocaleString()}원`} />
                <Stat label="평가금액" value={`${Math.round(totalEvaluation).toLocaleString()}원`} />
                <Stat
                  label="누적 수익률"
                  value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`}
                  tone={totalReturn >= 0 ? "positive" : "negative"}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                * 모의투자는 가상 잔고이며 실제 거래와 무관합니다. 데이터는 브라우저에 저장됩니다.
              </p>
            </section>

            {/* ── 빠른 메뉴 ── */}
            <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <QuickLink to="/alerts" icon={Bell} label="알림 설정" />
              <QuickLink to="/articles" icon={UserIcon} label="내 게시글" />
              <button
                onClick={logout}
                className="bg-card border border-border rounded-2xl p-4 hover:bg-accent text-sm font-medium flex items-center gap-2 justify-center text-negative"
              >
                <LogOut className="h-4 w-4" /> 로그아웃
              </button>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const cls =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-data text-base font-bold mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="bg-card border border-border rounded-2xl p-4 hover:bg-accent text-sm font-medium flex items-center gap-2 justify-center text-foreground"
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}
