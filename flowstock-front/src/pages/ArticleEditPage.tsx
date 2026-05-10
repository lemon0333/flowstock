/**
 * ============================================================
 * 게시글 작성/수정 (/articles/new, /articles/:id/edit)
 * ============================================================
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { articleApi, type ArticleCategory } from "@/services/api";
import { useStore } from "@/stores/useStore";

const CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: "GENERAL", label: "일반" },
  { value: "ANALYSIS", label: "분석" },
  { value: "NEWS", label: "뉴스" },
  { value: "QUESTION", label: "질문" },
  { value: "REVIEW", label: "복기" },
];

export default function ArticleEditPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useStore();
  const isEdit = !!id;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<ArticleCategory>("GENERAL");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!isEdit || !id) return;
    let alive = true;
    articleApi
      .get(Number(id))
      .then((res) => {
        if (!alive || !res.data) return;
        setTitle(res.data.title);
        setContent(res.data.content);
        setCategory(res.data.category);
      })
      .catch(() => alive && setError("글을 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, isEdit, isAuthenticated, navigate]);

  const handleSubmit = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) {
      setError("제목과 본문을 적어 주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (isEdit && id) {
        await articleApi.update(Number(id), { title: t, content: c, category });
        navigate(`/articles/${id}`);
      } else {
        const res = await articleApi.create({ title: t, content: c, category });
        const newId = res.data?.id;
        if (newId) navigate(`/articles/${newId}`);
        else navigate("/articles");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">로드 중…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 max-w-3xl mx-auto">
        <Link
          to={isEdit ? `/articles/${id}` : "/articles"}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 취소
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "게시글 수정" : "새 게시글"}
          </h1>
        </div>

        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">카테고리</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    category === c.value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="제목 (최대 200자)"
              className="mt-2 w-full px-3 py-2 rounded-xl border border-border bg-background"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              본문 <span>({content.length} / 50,000)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={50_000}
              placeholder="자유롭게 분석/복기/생각을 적어주세요"
              className="mt-2 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-y"
              rows={16}
            />
          </div>

          {error && <div className="text-sm text-negative">{error}</div>}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2 rounded-full text-sm font-medium border border-border hover:bg-accent"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !content.trim()}
              className="px-5 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "저장 중..." : isEdit ? "수정" : "등록"}
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
