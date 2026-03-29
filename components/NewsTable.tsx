"use client";

import { useState, useEffect } from "react";
import type { Article, ContentType } from "@/lib/supabase";
import { CONTENT_TYPES } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  news: "뉴스",
  report: "보고서",
  research: "학술",
  consulting: "컨설팅",
  government: "정부정책",
  global: "글로벌",
  investment: "투자",
  blog: "블로그",
};

const CATEGORY_LABELS: Record<string, string> = {
  competitive: "경쟁",
  market: "시장",
  regulation: "규제",
  tech: "기술",
  customer: "고객",
  investment: "투자",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
  } catch {
    return "";
  }
}

function avgScoreOf(items: Article[]): string {
  if (items.length === 0) return "0";
  return (items.reduce((s, a) => s + (a.relevance_score || 0), 0) / items.length).toFixed(1);
}

export default function NewsTable() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<ContentType | "all">("all");
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
        if (Array.isArray(data.articles) && data.articles.length > 0) {
          setArticles(data.articles);
          setLoading(false);
        }
        const count = data.articlesCount || data.articles?.length || 0;
        if (data.errors?.length > 0 && count > 0) {
          toast(`수집 완료! ${count}건 (일부 오류: ${data.errors.length}건)`, "success");
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

  const filtered = filter === "all" ? articles : articles.filter((a) => a.content_type === filter);

  // Group by urgency
  const redArticles = filtered
    .filter((a) => a.urgency === "red")
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const yellowArticles = filtered
    .filter((a) => a.urgency === "yellow")
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const otherArticles = filtered
    .filter((a) => a.urgency !== "red" && a.urgency !== "yellow")
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

  const total = articles.length;
  const redCount = articles.filter((a) => a.urgency === "red").length;
  const yellowCount = articles.filter((a) => a.urgency === "yellow").length;
  const avgScore =
    total > 0
      ? (articles.reduce((s, a) => s + (a.relevance_score || 0), 0) / total).toFixed(1)
      : "0";

  // Category distribution
  const catCounts: Record<string, number> = {};
  for (const a of articles) {
    if (a.category) {
      catCounts[a.category] = (catCounts[a.category] || 0) + 1;
    }
  }

  const renderArticle = (article: Article) => {
    const score = article.relevance_score || 0;
    const scoreColor =
      score >= 8 ? "text-red-600 font-bold" : score >= 6 ? "text-blue-600 font-semibold" : "text-gray-500";
    const dateStr = formatDate(article.published_at);

    return (
      <div key={article.id} className="py-2.5 border-b border-gray-100 last:border-0">
        {/* Line 1: Score + Date + Type + Category + Title + Source */}
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className={`text-xs ${scoreColor} flex-shrink-0 pt-0.5`}>
            [{score > 0 ? `${score}/10` : "-"}]
          </span>
          {dateStr && (
            <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
              {dateStr}
            </span>
          )}
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded flex-shrink-0 mt-0.5">
            {CONTENT_TYPE_LABELS[article.content_type] || article.content_type}
          </span>
          {article.category && (
            <span className="text-[10px] text-gray-400 bg-gray-50 px-1 rounded flex-shrink-0 mt-0.5">
              {CATEGORY_LABELS[article.category] || article.category}
            </span>
          )}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-700 hover:text-blue-900 hover:underline leading-tight flex-1 min-w-0"
          >
            {article.title_ko || article.title}
          </a>
          {article.source && (
            <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
              {article.source}
            </span>
          )}
        </div>

        {/* Line 2: Summary */}
        {(article.summary_ko || article.summary) && (
          <p className="text-xs text-gray-600 mt-1 pl-1 leading-relaxed">
            {article.summary_ko || article.summary}
          </p>
        )}

        {/* Line 3: Impact */}
        {article.impact_comment && (
          <p className="text-xs mt-1 pl-1 leading-relaxed">
            <span className="font-semibold text-gray-800">ACRYL 임팩트:</span>{" "}
            <span className="text-gray-700">{article.impact_comment}</span>
          </p>
        )}

        {/* Line 4: Deep summary */}
        {article.deep_summary && (
          <p className="text-xs text-gray-500 mt-1 pl-1 leading-relaxed italic">
            {article.deep_summary}
          </p>
        )}

        {/* Line 5: Keywords + Key findings */}
        {(article.matched_keywords?.length > 0 || article.key_findings?.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-1.5 pl-1">
            {article.matched_keywords?.map((k) => (
              <span key={k} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                {k}
              </span>
            ))}
            {article.key_findings?.length > 0 && (
              <span className="text-[10px] text-gray-500 italic">
                | {article.key_findings.join(" / ")}
              </span>
            )}
          </div>
        )}

        {/* Action items */}
        {article.action_items?.length > 0 && (
          <p className="text-[10px] text-orange-600 mt-1 pl-1">
            Action: {article.action_items.join(" / ")}
          </p>
        )}
      </div>
    );
  };

  const renderSection = (
    label: string,
    emoji: string,
    bgColor: string,
    borderColor: string,
    items: Article[]
  ) => {
    if (items.length === 0) return null;
    const sectionAvg = avgScoreOf(items);
    return (
      <div className="mb-2">
        <div className={`flex items-center gap-2 py-1.5 px-3 ${bgColor} border-l-4 ${borderColor}`}>
          <span className="text-sm font-bold text-gray-900">{emoji} {label}</span>
          <span className="text-xs text-gray-500">{items.length}건</span>
          <span className="text-xs text-gray-400 ml-auto">평균 {sectionAvg}/10</span>
        </div>
        <div className="px-3">
          {items.map((a) => renderArticle(a))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Summary + Action */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div>
          <span className="text-gray-500 text-xs">전체 </span>
          <span className="text-gray-900 text-lg font-bold">{total}건</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="text-red-600 font-medium">긴급 {redCount}</span>
          <span className="text-yellow-600 font-medium">주의 {yellowCount}</span>
          <span className="text-green-600">참고 {total - redCount - yellowCount}</span>
        </div>
        <div>
          <span className="text-gray-500 text-xs">평균 </span>
          <span className="text-blue-600 font-semibold text-sm">{avgScore}/10</span>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs sm:text-sm font-medium transition"
        >
          {running ? "수집 중..." : "수집 시작"}
        </button>
      </div>

      {/* Category Distribution */}
      {Object.keys(catCounts).length > 0 && (
        <div className="flex gap-1.5 flex-wrap text-[10px] px-1">
          {Object.entries(catCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, cnt]) => (
              <span key={cat} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {CATEGORY_LABELS[cat] || cat} {cnt}
              </span>
            ))}
        </div>
      )}

      {/* Content Type Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter("all")}
          className={`px-2.5 py-1 rounded text-xs transition whitespace-nowrap flex-shrink-0 ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-500 hover:text-gray-700 border border-gray-200"
          }`}
        >
          전체
        </button>
        {CONTENT_TYPES.map((ct) => {
          const count = articles.filter((a) => a.content_type === ct).length;
          if (count === 0) return null;
          return (
            <button
              key={ct}
              onClick={() => setFilter(ct)}
              className={`px-2.5 py-1 rounded text-xs transition whitespace-nowrap flex-shrink-0 ${
                filter === ct
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-500 hover:text-gray-700 border border-gray-200"
              }`}
            >
              {CONTENT_TYPE_LABELS[ct]} {count}
            </button>
          );
        })}
      </div>

      {/* Articles by Urgency */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          수집된 콘텐츠가 없습니다. &quot;수집 시작&quot; 버튼을 클릭하세요.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {renderSection("긴급", "🔴", "bg-red-50", "border-red-500", redArticles)}
          {renderSection("주의", "🟡", "bg-yellow-50", "border-yellow-500", yellowArticles)}
          {renderSection("참고", "🟢", "bg-gray-50", "border-gray-300", otherArticles)}
        </div>
      )}
    </div>
  );
}
