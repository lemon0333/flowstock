/**
 * /feedback — 서비스 개선 제안 게시판
 *
 * - 목록: 비로그인도 열람 가능 (작성자는 마스킹)
 * - 작성/삭제/좋아요: 로그인 필수
 * - 상태 변경: admin (andyhyunbin@gmail.com) 만 가능
 */

import { useCallback, useEffect, useState } from "react";
import { Lightbulb, Heart, Trash2, Send, Loader2, ShieldCheck } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PaginationControl from "@/components/ui/pagination-control";
import { useStore } from "@/stores/useStore";
import {
  feedbackApi,
  type FeedbackItem,
  type FeedbackStatus,
} from "@/services/api";

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  OPEN: "접수",
  IN_PROGRESS: "검토 중",
  DONE: "처리됨",
  REJECTED: "보류",
};

const STATUS_COLOR: Record<FeedbackStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  DONE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  REJECTED: "bg-muted text-muted-foreground",
};

const PAGE_SIZE = 10;

export default function FeedbackPage() {
  const { isAuthenticated } = useStore();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filter, setFilter] = useState<FeedbackStatus | "">("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await feedbackApi.list(filter || undefined, page, PAGE_SIZE);
      const data = res.data;
      if (data) {
        setItems(data.content ?? []);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
        setTotalItems(data.totalElements ?? 0);
      }
    } catch (e) {
      setError((e as Error).message || "피드백을 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await feedbackApi.create({ title: title.trim(), content: content.trim() });
      setTitle("");
      setContent("");
      setShowForm(false);
      setPage(0);
      await load();
    } catch (e) {
      setError((e as Error).message || "작성에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (id: number) => {
    if (!isAuthenticated) return;
    try {
      const res = await feedbackApi.toggleLike(id);
      const updated = res.data;
      if (updated) {
        setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      }
    } catch (e) {
      setError((e as Error).message || "좋아요 실패");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제할까요?")) return;
    try {
      await feedbackApi.remove(id);
      await load();
    } catch (e) {
      setError((e as Error).message || "삭제 실패");
    }
  };

  const handleStatusChange = async (id: number, status: FeedbackStatus) => {
    try {
      const res = await feedbackApi.updateStatus(id, status);
      const updated = res.data;
      if (updated) {
        setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      }
    } catch (e) {
      setError((e as Error).message || "상태 변경 실패");
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">서비스 개선 제안</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            FlowStock에 추가됐으면 하는 기능, 불편한 점, 개선 아이디어를 적어주세요.
            다른 사람이 같은 의견에 ❤️ 표시하면 우선순위가 올라가요.
          </p>
        </header>

        {/* 필터 + 작성 버튼 */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-sm">
            {(["", "OPEN", "IN_PROGRESS", "DONE", "REJECTED"] as const).map((s) => (
              <button
                key={s || "all"}
                type="button"
                onClick={() => { setFilter(s); setPage(0); }}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                  filter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {s === "" ? "전체" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="text-sm px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {showForm ? "취소" : "+ 새 제안"}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">
              작성하려면 <a href="/login" className="text-primary underline">로그인</a> 해주세요
            </span>
          )}
        </div>

        {/* 작성 폼 */}
        {showForm && isAuthenticated && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 bg-card border border-border rounded-2xl p-4 space-y-3"
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="한 줄로 요약 (예: 차트에 이동평균선 추가됐으면)"
              maxLength={200}
              required
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="자세한 설명 (왜 필요한지, 어떻게 동작하면 좋을지 등)"
              rows={5}
              maxLength={5000}
              required
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                작성자는 이메일 앞 3자만 표시 (예: and***@gmail.com)
              </span>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "전송 중..." : "제출"}
              </button>
            </div>
          </form>
        )}

        {/* 에러 */}
        {error && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* 목록 */}
        {loading && items.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-12 text-center text-sm text-muted-foreground">
            불러오는 중…
          </div>
        ) : items.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-12 text-center text-sm text-muted-foreground">
            아직 등록된 제안이 없어요. 첫 제안을 적어주세요!
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <FeedbackCard
                key={it.id}
                item={it}
                isAuthenticated={isAuthenticated}
                onLike={() => handleLike(it.id)}
                onDelete={() => handleDelete(it.id)}
                onStatusChange={(s) => handleStatusChange(it.id, s)}
              />
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <PaginationControl
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onChange={setPage}
            className="mt-6"
          />
        )}
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────

interface CardProps {
  item: FeedbackItem;
  isAuthenticated: boolean;
  onLike: () => void;
  onDelete: () => void;
  onStatusChange: (s: FeedbackStatus) => void;
}

function FeedbackCard({ item, isAuthenticated, onLike, onDelete, onStatusChange }: CardProps) {
  // admin 여부는 응답에 안 옴 — status select는 본인이 admin이면 백엔드에서 변경 가능.
  // 일단 "내 글 + 모든 사용자에게 status select 노출" 대신, 모든 사용자에게 노출하되
  // admin 아니면 backend에서 403 반환 → 에러 메시지로 표시.
  // 단순화: status select는 항상 표시하되 비-admin이 누르면 에러.
  // 더 명확한 UX 위해 isAdmin 정보를 응답에 추가하는 게 좋지만 MVP에선 후순위.

  return (
    <article className="bg-card border border-border rounded-2xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-base text-foreground flex-1 break-words">
          {item.title}
        </h3>
        <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[item.status]}`}>
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed mb-3">
        {item.content}
      </p>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{item.authorMasked}</span>
          <span>·</span>
          <span>{new Date(item.createdAt).toLocaleDateString("ko-KR")}</span>
          {item.isMine && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">내 글</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* 좋아요 */}
          <button
            type="button"
            onClick={onLike}
            disabled={!isAuthenticated}
            title={isAuthenticated ? "좋아요" : "로그인 필요"}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
              item.likedByMe
                ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                : "bg-muted text-muted-foreground hover:bg-accent"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Heart className={`h-3.5 w-3.5 ${item.likedByMe ? "fill-current" : ""}`} />
            <span className="font-num">{item.likeCount}</span>
          </button>

          {/* 본인: 삭제 */}
          {item.isMine && (
            <button
              type="button"
              onClick={onDelete}
              title="삭제"
              className="p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* admin: 상태 변경 (모든 로그인 사용자에게 노출, 권한 체크는 backend) */}
          {isAuthenticated && (
            <div className="relative inline-flex items-center" title="운영자 전용 — 상태 변경">
              <ShieldCheck className="h-3 w-3 text-muted-foreground/60 mr-0.5" />
              <select
                value={item.status}
                onChange={(e) => onStatusChange(e.target.value as FeedbackStatus)}
                className="text-[10px] bg-transparent border border-border rounded px-1 py-0.5 text-muted-foreground"
              >
                {(Object.keys(STATUS_LABEL) as FeedbackStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
