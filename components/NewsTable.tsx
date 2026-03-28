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
  red: { bg: "bg-red-500/20", text: "text-red-400", label: "🔴 긴급" },
  yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "🟡 주의" },
  green: { bg: "bg-green-500/20", text: "text-green-400", label: "🟢 참고" },
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
      if (data.status === "completed") {
        await fetchArticles();
        toast(`수집 완료! ${data.articlesCount}건 수집, ${data.sent}건 발송`, "success");
      } else {
        toast(`실패: ${data.errors?.join(", ")}`, "error");
      }
    } catch {
      toast("파이프라인 실행 실패", "error");
    }
    setRunning(false);
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

  // Summary stats
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
      <div className="flex items-center gap-6 p-4 bg-[#1E293B] border border-[#334155] rounded-lg">
        <div>
          <span className="text-[#64748B] text-sm">전체 </span>
          <span className="text-white text-xl font-bold">{total}건</span>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-red-400">🔴 {redCount}</span>
          <span className="text-yellow-400">🟡 {yellowCount}</span>
          <span className="text-green-400">🟢 {greenCount}</span>
        </div>
        <div>
          <span className="text-[#64748B] text-sm">평균 관련도 </span>
          <span className="text-blue-400 font-semibold">{avgScore}/10</span>
        </div>
        <div className="flex gap-2 text-xs text-[#94A3B8]">
          {CONTENT_TYPES.map((ct) => {
            const count = articles.filter((a) => a.content_type === ct).length;
            return count > 0 ? (
              <span key={ct}>{CONTENT_TYPE_LABELS[ct]} {count}</span>
            ) : null;
          })}
        </div>
        <div className="ml-auto flex gap-2">
          {total > 0 && (
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-[#E2E8F0] rounded-lg text-sm font-medium transition"
            >
              📧 뉴스레터 미리보기
            </button>
          )}
          <button
            onClick={handleRun}
            disabled={running}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition"
          >
            {running ? "수집 중..." : "🚀 수집 시작"}
          </button>
        </div>
      </div>

      {/* Content Type Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-md text-sm transition ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#334155]"
          }`}
        >
          전체
        </button>
        {CONTENT_TYPES.map((ct) => (
          <button
            key={ct}
            onClick={() => setFilter(ct)}
            className={`px-3 py-1.5 rounded-md text-sm transition ${
              filter === ct
                ? "bg-blue-600 text-white"
                : "bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#334155]"
            }`}
          >
            {CONTENT_TYPE_LABELS[ct]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-[#64748B]">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#64748B]">
          수집된 콘텐츠가 없습니다. &quot;수집 시작&quot; 버튼을 클릭하세요.
        </div>
      ) : (
        <div className="border border-[#334155] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0F172A] border-b-2 border-[#334155]">
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold w-8">#</th>
                <th
                  className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold cursor-pointer hover:text-[#94A3B8]"
                  onClick={() => handleSort("urgency")}
                >
                  긴급도 {sortKey === "urgency" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th
                  className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold cursor-pointer hover:text-[#94A3B8]"
                  onClick={() => handleSort("relevance_score")}
                >
                  관련도 {sortKey === "relevance_score" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">카테고리</th>
                <th
                  className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold cursor-pointer hover:text-[#94A3B8]"
                  onClick={() => handleSort("content_type")}
                >
                  유형 {sortKey === "content_type" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">제목</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">출처</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((article, i) => {
                const urgStyle = URGENCY_STYLES[article.urgency || ""] || {
                  bg: "",
                  text: "text-[#64748B]",
                  label: "-",
                };
                const isExpanded = expandedId === article.id;
                return (
                  <tr key={article.id} className="group">
                    <td colSpan={7} className="p-0">
                      <div
                        className="flex items-center cursor-pointer hover:bg-[#1E293B]/50 border-b border-[#334155]"
                        onClick={() => setExpandedId(isExpanded ? null : article.id)}
                      >
                        <div className="px-3 py-2.5 text-[#64748B] text-xs w-8">{i + 1}</div>
                        <div className="px-3 py-2.5 w-20">
                          <span className={`text-xs ${urgStyle.bg} ${urgStyle.text} px-2 py-0.5 rounded`}>
                            {urgStyle.label}
                          </span>
                        </div>
                        <div className="px-3 py-2.5 w-28">
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-2 bg-[#0F172A] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(article.relevance_score || 0) * 10}%` }}
                              />
                            </div>
                            <span className="text-blue-400 text-xs">{article.relevance_score || "-"}</span>
                          </div>
                        </div>
                        <div className="px-3 py-2.5 w-16">
                          <span className="text-xs bg-[#1E293B] border border-[#475569] rounded px-1.5 py-0.5 text-[#CBD5E1]">
                            {CATEGORY_LABELS[article.category || ""] || "-"}
                          </span>
                        </div>
                        <div className="px-3 py-2.5 w-20">
                          <span className="text-xs text-[#94A3B8]">
                            {CONTENT_TYPE_LABELS[article.content_type] || article.content_type}
                          </span>
                        </div>
                        <div className="px-3 py-2.5 flex-1 min-w-0">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm truncate block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {article.title}
                          </a>
                        </div>
                        <div className="px-3 py-2.5 w-24 text-[#94A3B8] text-xs truncate">
                          {article.source || "-"}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-6 py-3 bg-[#1E293B]/80 border-b border-[#334155]">
                          <div className="text-sm text-[#CBD5E1] mb-2">
                            <strong className="text-[#F8FAFC]">ACRYL 임팩트:</strong>{" "}
                            {article.impact_comment || "분석 없음"}
                          </div>
                          {article.summary && (
                            <div className="text-xs text-[#94A3B8]">
                              <strong>요약:</strong> {article.summary}
                            </div>
                          )}
                          {article.matched_keywords?.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {article.matched_keywords.map((k) => (
                                <span
                                  key={k}
                                  className="text-xs bg-[#0F172A] border border-[#475569] rounded px-1.5 py-0.5 text-[#94A3B8]"
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
      )}

      {/* Newsletter Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative w-[95vw] h-[90vh] bg-[#1E293B] rounded-lg border border-[#334155] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155]">
              <h3 className="text-sm font-semibold">뉴스레터 미리보기</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-[#94A3B8] hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
            <iframe
              src="/api/newsletter/preview"
              className="w-full h-[calc(100%-48px)]"
              title="Newsletter Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
