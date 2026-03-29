"use client";

import { useState, useEffect } from "react";
import type { Article } from "@/lib/supabase";

const TAG_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "긴급 대응": { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  "시장 시그널": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  "기회 포착": { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-900" },
  "주간 맥락": { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500" },
};

function parseBrief(brief: string): { tag: string; content: string }[] {
  const tags = Object.keys(TAG_COLORS);
  const regex = new RegExp(
    `\\[(${tags.join("|")})\\]\\s*(.+?)(?=\\[(?:${tags.join("|")})\\]|$)`,
    "gs"
  );

  const sections: { tag: string; content: string }[] = [];
  let match;
  while ((match = regex.exec(brief)) !== null) {
    const content = match[2].trim();
    if (content) {
      sections.push({ tag: match[1], content });
    }
  }

  // Fallback: no tags found
  if (sections.length === 0 && brief.trim()) {
    sections.push({ tag: "", content: brief.trim() });
  }

  return sections;
}

export default function AIAnalysis() {
  const [brief, setBrief] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/articles/latest");
        const data = await res.json();
        setArticles(data.articles || []);
        if (data.executiveBrief) {
          setBrief(data.executiveBrief);
        }
      } catch {
        setError("기사 로드 실패");
      }
      setLoading(false);
    })();
  }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/run", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      }
      if (data.brief) {
        setBrief(data.brief);
      }
    } catch {
      setError("AI 분석 요청 실패");
    }
    setAnalyzing(false);
  };

  const sections = parseBrief(brief);

  const redCount = articles.filter((a) => a.urgency === "red").length;
  const yellowCount = articles.filter((a) => a.urgency === "yellow").length;
  const greenCount = articles.length - redCount - yellowCount;

  if (loading) {
    return <div className="text-center py-12 text-gray-400">로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div>
          <span className="text-gray-500 text-xs sm:text-sm">분석 대상 </span>
          <span className="text-gray-900 text-lg sm:text-xl font-bold">{articles.length}건</span>
        </div>
        {articles.length > 0 && (
          <div className="flex gap-2 sm:gap-3 text-xs sm:text-sm">
            <span className="text-red-600">긴급 {redCount}</span>
            <span className="text-yellow-600">주의 {yellowCount}</span>
            <span className="text-green-600">참고 {greenCount}</span>
          </div>
        )}
        <div className="ml-auto">
          <button
            onClick={runAnalysis}
            disabled={analyzing || articles.length === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg text-xs sm:text-sm font-medium transition"
          >
            {analyzing ? "분석 중..." : "AI 분석 실행"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Analysis Result */}
      {sections.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">AI 핵심 요약</h3>
          </div>
          <div className="p-4 space-y-3">
            {sections.map((s, i) => {
              const style = s.tag ? TAG_COLORS[s.tag] : null;
              return (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${
                    style
                      ? `${style.bg} ${style.border}`
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {s.tag && (
                    <span
                      className={`text-xs font-bold ${
                        style ? style.text : "text-gray-700"
                      } mr-2`}
                    >
                      [{s.tag}]
                    </span>
                  )}
                  <span className="text-sm text-gray-800 leading-relaxed">{s.content}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : !analyzing && articles.length > 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="text-gray-400 text-sm mb-2">아직 AI 분석이 실행되지 않았습니다.</div>
          <div className="text-gray-400 text-xs">&quot;AI 분석 실행&quot; 버튼을 클릭하세요.</div>
        </div>
      ) : null}

      {/* Analyzing indicator */}
      {analyzing && (
        <div className="text-center py-8 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="text-purple-600 text-sm font-medium mb-1">AI가 기사를 분석하고 있습니다...</div>
          <div className="text-gray-400 text-xs">최대 1분 소요될 수 있습니다.</div>
        </div>
      )}

      {/* Article Summary */}
      {articles.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              분석 대상 기사 ({articles.length}건)
            </h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {articles.slice(0, 30).map((a, i) => (
              <div key={a.id} className="px-4 py-2.5 flex items-start gap-3">
                <span className="text-gray-400 text-xs mt-0.5 w-5 flex-shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 line-clamp-1"
                  >
                    {a.title_ko || a.title}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    <span>{a.source || "-"}</span>
                    {a.urgency && (
                      <span
                        className={
                          a.urgency === "red"
                            ? "text-red-500"
                            : a.urgency === "yellow"
                            ? "text-yellow-500"
                            : "text-green-500"
                        }
                      >
                        {a.urgency === "red" ? "긴급" : a.urgency === "yellow" ? "주의" : "참고"}
                      </span>
                    )}
                    {a.relevance_score != null && (
                      <span className="text-blue-500">{a.relevance_score}/10</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {articles.length > 30 && (
              <div className="px-4 py-2 text-xs text-gray-400 text-center">
                외 {articles.length - 30}건 더...
              </div>
            )}
          </div>
        </div>
      )}

      {articles.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          수집된 기사가 없습니다. &quot;뉴스레터&quot; 탭에서 수집을 먼저 실행하세요.
        </div>
      )}
    </div>
  );
}
