/**
 * ============================================================
 * 게시글 상세 (/articles/:id)
 * - 본문 + 좋아요 + 댓글 작성/삭제
 * - 작성자 본인 → 수정/삭제 노출
 * ============================================================
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, MessageSquare, Pencil, Trash2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { articleApi, type ArticleDetail } from "@/services/api";
import { useStore } from "@/stores/useStore";

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useStore();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const articleId = Number(id);

  useEffect(() => {
    if (!articleId) return;
    let alive = true;
    setLoading(true);
    articleApi
      .get(articleId)
      .then((res) => alive && setArticle(res.data ?? null))
      .catch((e: unknown) =>
        alive && setError(e instanceof Error ? e.message : "글을 불러오지 못했습니다."),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [articleId]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const res = await articleApi.toggleLike(articleId).catch(() => null);
    if (!res || !article) return;
    const liked = res.data?.liked ?? false;
    setArticle({
      ...article,
      likedByMe: liked,
      likeCount: article.likeCount + (liked ? 1 : -1),
    });
  };

  const handleComment = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const text = comment.trim();
    if (!text || !article) return;
    setSubmitting(true);
    try {
      const res = await articleApi.addComment(articleId, text);
      if (res.data) {
        setArticle({ ...article, comments: [...article.comments, res.data] });
        setComment("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("댓글을 삭제할까요?") || !article) return;
    await articleApi.removeComment(commentId).catch(() => null);
    setArticle({ ...article, comments: article.comments.filter((c) => c.id !== commentId) });
  };

  const handleDeleteArticle = async () => {
    if (!confirm("게시글을 삭제할까요? 되돌릴 수 없습니다.")) return;
    const res = await articleApi.remove(articleId).catch(() => null);
    if (res) navigate("/articles");
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">로드 중…</div>
      </Layout>
    );
  }

  if (error || !article) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">{error || "게시글을 찾을 수 없습니다."}</p>
          <Link to="/articles" className="text-primary text-sm mt-2 hover:underline">
            목록으로
          </Link>
        </div>
      </Layout>
    );
  }

  const userIdStr = user?.id != null ? String(user.id) : null;
  const isAuthor = userIdStr !== null && userIdStr === String(article.authorId);

  return (
    <Layout>
      <div className="space-y-5 max-w-3xl mx-auto">
        <Link
          to="/articles"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 목록
        </Link>

        <article className="bg-card border border-border rounded-2xl p-6">
          <header className="space-y-2 mb-5">
            <h1 className="text-xl font-bold tracking-tight">{article.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{article.authorName}</span>
              <span>·</span>
              <span>{new Date(article.createdAt).toLocaleString("ko-KR")}</span>
              <span>·</span>
              <span>조회 {article.viewCount}</span>
            </div>
          </header>

          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap break-words leading-relaxed">
            {article.content}
          </div>

          <footer className="mt-6 flex items-center gap-3 pt-4 border-t border-border">
            <button
              onClick={handleLike}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border ${
                article.likedByMe
                  ? "border-rose-500/40 text-rose-500 bg-rose-500/10"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              <Heart
                className={`h-4 w-4 ${article.likedByMe ? "fill-rose-500" : ""}`}
              />
              좋아요 {article.likeCount}
            </button>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              댓글 {article.comments.length}
            </span>

            {isAuthor && (
              <div className="ml-auto flex items-center gap-2">
                <Link
                  to={`/articles/${article.id}/edit`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-border hover:bg-accent"
                >
                  <Pencil className="h-3 w-3" /> 수정
                </Link>
                <button
                  onClick={handleDeleteArticle}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-negative/30 text-negative hover:bg-negative/10"
                >
                  <Trash2 className="h-3 w-3" /> 삭제
                </button>
              </div>
            )}
          </footer>
        </article>

        {/* 댓글 영역 */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-sm">댓글 {article.comments.length}</h2>

          {isAuthenticated ? (
            <div className="space-y-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="댓글 작성"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none"
                rows={3}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleComment}
                  disabled={submitting || !comment.trim()}
                  className="px-5 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "등록 중..." : "댓글 등록"}
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="block text-sm text-primary hover:underline">
              댓글을 작성하려면 로그인해주세요
            </Link>
          )}

          <ul className="divide-y divide-border">
            {article.comments.length === 0 ? (
              <li className="text-sm text-muted-foreground py-6 text-center">
                첫 댓글을 남겨보세요.
              </li>
            ) : (
              article.comments.map((c) => (
                <li key={c.id} className="py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{c.authorName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString("ko-KR")}
                      </span>
                      {userIdStr !== null && userIdStr === String(c.authorId) && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-[11px] text-muted-foreground hover:text-negative"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{c.content}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </Layout>
  );
}
