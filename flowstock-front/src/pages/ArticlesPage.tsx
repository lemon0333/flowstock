/**
 * ============================================================
 * 커뮤니티 게시글 목록 (/articles)
 * - 카테고리 필터, 페이지네이션
 * ============================================================
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Heart, MessageSquare, PenSquare } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { articleApi, type ArticleCategory, type ArticleListResponse } from "@/services/api";
import { useStore } from "@/stores/useStore";

const CATEGORIES: { value: ArticleCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "GENERAL", label: "일반" },
  { value: "ANALYSIS", label: "분석" },
  { value: "NEWS", label: "뉴스" },
  { value: "QUESTION", label: "질문" },
  { value: "REVIEW", label: "복기" },
];

const CAT_BADGE: Record<ArticleCategory, string> = {
  GENERAL: "bg-muted text-muted-foreground",
  ANALYSIS: "bg-primary/10 text-primary",
  NEWS: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  QUESTION: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  REVIEW: "bg-positive/15 text-positive",
};

export default function ArticlesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useStore();
  const [data, setData] = useState<ArticleListResponse | null>(null);
  const [category, setCategory] = useState<ArticleCategory | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    articleApi
      .list(category === "ALL" ? undefined : category, page, 20)
      .then((res) => alive && setData(res.data ?? null))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [category, page]);

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">커뮤니티</h1>
            <p className="text-sm text-muted-foreground mt-1">투자 분석/복기/뉴스를 공유</p>
          </div>
          <button
            onClick={() => {
              if (!isAuthenticated) {
                navigate("/login");
                return;
              }
              navigate("/articles/new");
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <PenSquare className="h-4 w-4" /> 글쓰기
          </button>
        </div>

        <section className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setCategory(c.value);
                setPage(0);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                category === c.value
                  ? "bg-primary/10 text-primary"
                  : "border border-border hover:bg-accent text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </section>

        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">로드 중…</div>
          ) : !data || data.content.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              아직 게시글이 없습니다.
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {data.content.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/articles/${a.id}`}
                      className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-accent/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CAT_BADGE[a.category]}`}
                          >
                            {CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category}
                          </span>
                          <span className="text-xs text-muted-foreground">{a.authorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.createdAt).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {a.viewCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {a.likeCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {a.commentCount}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
                <span>전체 {data.totalElements}건</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 rounded-full border border-border disabled:opacity-40 hover:bg-accent"
                  >
                    이전
                  </button>
                  <span>
                    {data.page + 1} / {Math.max(1, data.totalPages)}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(data.totalPages - 1, page + 1))}
                    disabled={page >= data.totalPages - 1}
                    className="px-3 py-1 rounded-full border border-border disabled:opacity-40 hover:bg-accent"
                  >
                    다음
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}
