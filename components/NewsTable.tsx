"use client";

import { useState, useEffect } from "react";
import type { Article, ContentType } from "@/lib/supabase";
import { CONTENT_TYPES } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  news: "📰 뉴스",
  report: "📊 보고서",
  research: "🎓 학술",
  consulting: "💼 컨설팅",
  government: "🏛️ 정부정책",
  global: "🌍 글로벌",
  investment: "💰 투자",
  blog: "🔬 블로그",
};

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  red: { bg: "bg-red-100", text: "text-red-700", label: "🔴 긴급" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700", label: "🟡 주의" },
  green: { bg: "bg-green-100", text: "text-green-700", label: "🟢 참고" },
};

const CATEGORY_LABELS: Record<string, string> = {
  competitive: "경쟁",
  market: "시장",
  regulation: "규제",
  tech: "기술",
  customer: "고객",
  investment: "투자",
};

export default function NewsTable() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<ContentType | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"relevance_score" | "urgency" | "content_type">("relevance_score");
  const [sortAsc, setSortAsc] = useState(false);
  const { toast } = useToast();

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/articles/latest");
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {
      console.error("Failed to fetch articles");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/pipeline/run", { method: "POST" });
      const data = await res.json();
      if (data.status === "completed" || data.status === "failed") {
        // Use articles directly from pipeline response (Vercel /tmp is ephemeral)
        if (Array.isArray(data.articles) && data.articles.length > 0) {
          setArticles(data.articles);
          setLoading(false);
        }
        const count = data.articlesCount || data.articles?.length || 0;
        if (data.errors?.length > 0 && count > 0) {
          toast(`수집 완료! ${count}건 수집 (일부 오류: ${data.errors.length}건)`, "success");
        } else if (count > 0) {
          toast(`수집 완료! ${count}건 수집, ${data.sent || 0}건 발송`, "success");
        } else {
          const errMsg = data.errors?.join(", ") || data.error || "수집된 기사가 없습니다";
          toast(`실패: ${errMsg}`, "error");
        }
      } else {
        const errMsg = data.errors?.join(", ") || data.error || "알 수 없는 오류";
        toast(`실패: ${errMsg}`, "error");
      }
    } catch {
      toast("파이프라인 실행 실패", "error");
    }
    setRunning(false);
  };

  const openPreview = async () => {
    try {
      const res = await fetch("/api/newsletter/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles }),
      });
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setShowPreview(true);
    } catch {
      toast("미리보기 생성 실패", "error");
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  };

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const urgencyOrder: Record<string, number> = { red: 3, yellow: 2, green: 1 };

  const filtered = (
    filter === "all"
      ? articles
      : articles.filter((a) => a.content_type === filter)
  ).sort((a, b) => {
    let cmp = 0;
    if (sortKey === "relevance_score") {
      cmp = (a.relevance_score || 0) - (b.relevance_score || 0);
    } else if (sortKey === "urgency") {
      cmp = (urgencyOrder[a.urgency || ""] || 0) - (urgencyOrder[b.urgency || ""] || 0);
    } else if (sortKey === "content_type") {
      cmp = (a.content_type || "").localeCompare(b.content_type || "");
    }
    return sortAsc ? cmp : -cmp;
  });

  const total = articles.length;
  const redCount = articles.filter((a) => a.urgency === "red").length;
  const yellowCount = articles.filter((a) => a.urgency === "yellow").length;
  const greenCount = articles.filter((a) => a.urgency === "green").length;
  const avgScore =
    total > 0
      ? (articles.reduce((s, a) => s + (a.relevance_score || 0), 0) / total).toFixed(1)
      : "0";

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div>
          <span className="text-gray-500 text-xs sm:text-sm">전체 </span>
          <span className="text-gray-900 text-lg sm:text-xl font-bold">{total}건</span>
        </div>
        <div className="flex gap-2 sm:gap-3 text-xs sm:text-sm">
          <span className="text-red-600">🔴 {redCount}</span>
          <span className="text-yellow-600">🟡 {yellowCount}</span>
          <span className="text-green-600">🟢 {greenCount}</span>
        </div>
        <div>
          <span className="text-gray-500 text-xs sm:text-sm">평균 관련도 </span>
          <span className="text-blue-600 font-semibold">{avgScore}/10</span>
        </div>
        <div className="hidden lg:flex gap-2 text-xs text-gray-500">
          {CONTENT_TYPES.map((ct) => {
            const count = articles.filter((a) => a.content_type === ct).length;
            return count > 0 ? (
              <span key={ct}>{CONTENT_TYPE_LABELS[ct]} {count}</span>
            ) : null;
          })}
        </div>
        <div className="ml-auto flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          {total > 0 && (
            <button
              onClick={openPreview}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-medium transition border border-gray-200"
            >
              📧 미리보기
            </button>
          )}
          <button
            onClick={handleRun}
            disabled={running}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs sm:text-sm font-medium transition"
          >
            {running ? "수집 중..." : "🚀 수집 시작"}
          </button>
        </div>
      </div>

      {/* Content Type Filter */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter("all")}
          className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
          }`}
        >
          전체
        </button>
        {CONTENT_TYPES.map((ct) => (
          <button
            key={ct}
            onClick={() => setFilter(ct)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${
              filter === ct
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
            }`}
          >
            {CONTENT_TYPE_LABELS[ct]}
          </button>
        ))}
      </div>

      {/* Articles */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          수집된 콘텐츠가 없습니다. &quot;수집 시작&quot; 버튼을 클릭하세요.
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold w-8">#</th>
                  <th
                    className="px-3 py-2 text-left text-gray-500 text-xs font-semibold cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort("urgency")}
                  >
                    긴급도 {sortKey === "urgency" ? (sortAsc ? "↑" : "↓") : ""}
                  </th>
                  <th
                    className="px-3 py-2 text-left text-gray-500 text-xs font-semibold cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort("relevance_score")}
                  >
                    관련도 {sortKey === "relevance_score" ? (sortAsc ? "↑" : "↓") : ""}
                  </th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">카테고리</th>
                  <th
                    className="px-3 py-2 text-left text-gray-500 text-xs font-semibold cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort("content_type")}
                  >
                    유형 {sortKey === "content_type" ? (sortAsc ? "↑" : "↓") : ""}
                  </th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">제목</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">출처</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((article, i) => {
                  const urgStyle = URGENCY_STYLES[article.urgency || ""] || {
                    bg: "",
                    text: "text-gray-400",
                    label: "-",
                  };
                  const isExpanded = expandedId === article.id;
                  return (
                    <tr key={article.id} className="group">
                      <td colSpan={7} className="p-0">
                        <div
                          className="flex items-center cursor-pointer hover:bg-blue-50 border-b border-gray-100"
                          onClick={() => setExpandedId(isExpanded ? null : article.id)}
                        >
                          <div className="px-3 py-2.5 text-gray-400 text-xs w-8">{i + 1}</div>
                          <div className="px-3 py-2.5 w-20">
                            <span className={`text-xs ${urgStyle.bg} ${urgStyle.text} px-2 py-0.5 rounded`}>
                              {urgStyle.label}
                            </span>
                          </div>
                          <div className="px-3 py-2.5 w-28">
                            <div className="flex items-center gap-1">
                              <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${(article.relevance_score || 0) * 10}%` }}
                                />
                              </div>
                              <span className="text-blue-600 text-xs">{article.relevance_score || "-"}</span>
                            </div>
                          </div>
                          <div className="px-3 py-2.5 w-16">
                            <span className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
                              {CATEGORY_LABELS[article.category || ""] || "-"}
                            </span>
                          </div>
                          <div className="px-3 py-2.5 w-20">
                            <span className="text-xs text-gray-500">
                              {CONTENT_TYPE_LABELS[article.content_type] || article.content_type}
                            </span>
                          </div>
                          <div className="px-3 py-2.5 flex-1 min-w-0">
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm truncate block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {article.title_ko || article.title}
                            </a>
                          </div>
                          <div className="px-3 py-2.5 w-24 text-gray-500 text-xs truncate">
                            {article.source || "-"}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
                            <div className="text-sm text-gray-700 mb-2">
                              <strong className="text-gray-900">ACRYL 임팩트:</strong>{" "}
                              {article.impact_comment || "분석 없음"}
                            </div>
                            {article.summary && (
                              <div className="text-xs text-gray-500">
                                <strong>요약:</strong> {article.summary_ko || article.summary}
                              </div>
                            )}
                            {article.matched_keywords?.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {article.matched_keywords.map((k) => (
                                  <span
                                    key={k}
                                    className="text-xs bg-white border border-gray-300 rounded px-1.5 py-0.5 text-gray-600"
                                  >
                                    {k}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filtered.map((article, i) => {
              const urgStyle = URGENCY_STYLES[article.urgency || ""] || {
                bg: "",
                text: "text-gray-400",
                label: "-",
              };
              const isExpanded = expandedId === article.id;
              return (
                <div
                  key={article.id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                >
                  <div
                    className="p-3 cursor-pointer active:bg-gray-50"
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-gray-400 text-xs">{i + 1}</span>
                      <span className={`text-xs ${urgStyle.bg} ${urgStyle.text} px-2 py-0.5 rounded`}>
                        {urgStyle.label}
                      </span>
                      <span className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
                        {CATEGORY_LABELS[article.category || ""] || "-"}
                      </span>
                      <span className="text-blue-600 text-xs ml-auto font-medium">
                        {article.relevance_score || "-"}/10
                      </span>
                    </div>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium line-clamp-2 block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {article.title_ko || article.title}
                    </a>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                      <span>{CONTENT_TYPE_LABELS[article.content_type] || article.content_type}</span>
                      <span>·</span>
                      <span>{article.source || "-"}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-3 py-3 bg-blue-50 border-t border-gray-200">
                      <div className="text-sm text-gray-700 mb-2">
                        <strong className="text-gray-900">ACRYL 임팩트:</strong>{" "}
                        {article.impact_comment || "분석 없음"}
                      </div>
                      {article.summary && (
                        <div className="text-xs text-gray-500">
                          <strong>요약:</strong> {article.summary_ko || article.summary}
                        </div>
                      )}
                      {article.matched_keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {article.matched_keywords.map((k) => (
                            <span
                              key={k}
                              className="text-xs bg-white border border-gray-300 rounded px-1.5 py-0.5 text-gray-600"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Newsletter Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-[95vw] h-[90vh] bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">뉴스레터 미리보기</h3>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>
            <iframe
              src={previewUrl || "/api/newsletter/preview"}
              className="w-full h-[calc(100%-48px)]"
              title="Newsletter Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
