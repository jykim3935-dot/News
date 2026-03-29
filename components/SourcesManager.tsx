"use client";

import { useState, useEffect } from "react";
import type { Source, ContentType, Category, SourceType } from "@/lib/supabase";
import { CONTENT_TYPES, CATEGORIES } from "@/lib/supabase";

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

const SOURCE_TYPES: SourceType[] = ["rss", "api", "websearch", "crawl"];

const PRESET_SOURCES: Omit<Source, "id" | "created_at">[] = [
  { name: "조선일보 경제", url: "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/", type: "rss", content_type: "news", category: "market", description: "조선일보 경제 섹션", enabled: true },
  { name: "한국경제", url: "https://www.hankyung.com/feed/all-news", type: "rss", content_type: "news", category: "market", description: "한국경제 전체 뉴스", enabled: true },
  { name: "매일경제", url: "https://www.mk.co.kr/rss/30000001/", type: "rss", content_type: "news", category: "market", description: "매일경제 전체 뉴스", enabled: true },
  { name: "전자신문", url: "https://rss.etnews.com/Section901.xml", type: "rss", content_type: "news", category: "tech", description: "전자신문 IT/과학", enabled: true },
  { name: "ZDNet Korea", url: "https://zdnet.co.kr/rss/newsall.xml", type: "rss", content_type: "news", category: "tech", description: "ZDNet Korea IT뉴스", enabled: true },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", type: "rss", content_type: "global", category: "tech", description: "TechCrunch 글로벌 테크 뉴스", enabled: true },
  { name: "금융위원회", url: "https://www.fsc.go.kr/po040301", type: "crawl", content_type: "government", category: "regulation", description: "금융위원회 보도자료", enabled: true },
  { name: "과학기술정보통신부", url: "https://www.msit.go.kr/bbs/list.do?sCode=user&mId=113&mPid=112", type: "crawl", content_type: "government", category: "regulation", description: "과기부 보도자료", enabled: true },
  { name: "McKinsey Insights", url: "https://www.mckinsey.com/rss/insights", type: "rss", content_type: "consulting", category: "market", description: "McKinsey 인사이트", enabled: true },
  { name: "Harvard Business Review", url: "https://hbr.org/resources/rss", type: "rss", content_type: "research", category: "market", description: "HBR 최신 아티클", enabled: true },
];

export default function SourcesManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<Omit<Source, "id" | "created_at">[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    type: "rss" as SourceType,
    content_type: "news" as ContentType,
    category: "market" as Category,
    description: "",
    enabled: true,
  });

  const fetchSources = async () => {
    const res = await fetch("/api/sources");
    const data = await res.json();
    setSources(data);
    setLoading(false);
  };

  useEffect(() => { fetchSources(); }, []);

  const resetForm = () => {
    setForm({ name: "", url: "", type: "rss", content_type: "news", category: "market", description: "", enabled: true });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    const method = editId ? "PATCH" : "POST";
    const url = editId ? `/api/sources/${editId}` : "/api/sources";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    resetForm();
    fetchSources();
  };

  const handleEdit = (source: Source) => {
    setForm({
      name: source.name,
      url: source.url,
      type: source.type,
      content_type: source.content_type,
      category: source.category,
      description: source.description || "",
      enabled: source.enabled,
    });
    setEditId(source.id);
    setShowForm(true);
  };

  const handleToggle = async (source: Source) => {
    await fetch(`/api/sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !source.enabled }),
    });
    fetchSources();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    fetchSources();
  };

  const handleAddPreset = async (preset: typeof PRESET_SOURCES[number]) => {
    const exists = sources.some((s) => s.name === preset.name);
    if (exists) return;
    await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset),
    });
    fetchSources();
  };

  const handleAddAllPresets = async () => {
    for (const preset of PRESET_SOURCES) {
      const exists = sources.some((s) => s.name === preset.name);
      if (!exists) {
        await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preset),
        });
      }
    }
    setShowPresets(false);
    fetchSources();
  };

  const handleAiSuggest = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery, type: "sources" }),
      });
      const data = await res.json();
      setAiSuggestions(data.suggestions || []);
    } catch {
      console.error("AI suggestion failed");
    }
    setAiLoading(false);
  };

  const handleAddAiSuggestion = async (suggestion: Omit<Source, "id" | "created_at">) => {
    const exists = sources.some((s) => s.name === suggestion.name || s.url === suggestion.url);
    if (exists) return;
    await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(suggestion),
    });
    fetchSources();
  };

  const handleAddAllAiSuggestions = async () => {
    for (const s of aiSuggestions) {
      const exists = sources.some((src) => src.name === s.name || src.url === s.url);
      if (!exists) {
        await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
      }
    }
    setAiSuggestions([]);
    setShowAi(false);
    fetchSources();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">수집 소스 ({sources.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAi(!showAi); setShowPresets(false); }}
            className="px-3 sm:px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs sm:text-sm border border-purple-200"
          >
            🤖 AI 추천
          </button>
          <button
            onClick={() => { setShowPresets(!showPresets); setShowAi(false); }}
            className="px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm border border-gray-200"
          >
            📋 프리셋
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm"
          >
            + 소스 추가
          </button>
        </div>
      </div>

      {/* AI Suggestion Panel */}
      {showAi && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
          <h4 className="text-sm font-semibold text-purple-900">🤖 AI 소스 추천</h4>
          <div className="flex gap-2">
            <input
              placeholder="예: AI 반도체, 헬스케어 AI, 글로벌 GPU 시장..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAiSuggest()}
              className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded text-sm text-gray-800"
            />
            <button
              onClick={handleAiSuggest}
              disabled={aiLoading || !aiQuery.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm disabled:opacity-50"
            >
              {aiLoading ? "분석 중..." : "추천받기"}
            </button>
          </div>
          {aiSuggestions.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-700">{aiSuggestions.length}개 소스 추천</span>
                <button
                  onClick={handleAddAllAiSuggestions}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
                >
                  전체 추가
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {aiSuggestions.map((s, i) => {
                  const exists = sources.some((src) => src.name === s.name || src.url === s.url);
                  return (
                    <div key={i} className="flex items-center justify-between p-2 bg-white rounded border border-purple-100">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                        <div className="text-xs text-gray-500 truncate">{s.description} · {CONTENT_TYPE_LABELS[s.content_type] || s.content_type}</div>
                        <div className="text-xs text-purple-400 truncate">{s.url}</div>
                      </div>
                      <button
                        onClick={() => handleAddAiSuggestion(s)}
                        disabled={exists}
                        className={`ml-2 px-2 py-1 rounded text-xs flex-shrink-0 ${
                          exists
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                        }`}
                      >
                        {exists ? "추가됨" : "+ 추가"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Presets Panel */}
      {showPresets && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-blue-900">추천 소스 프리셋</h4>
            <button
              onClick={handleAddAllPresets}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
            >
              전체 추가
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_SOURCES.map((preset) => {
              const exists = sources.some((s) => s.name === preset.name);
              return (
                <div key={preset.name} className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{preset.name}</div>
                    <div className="text-xs text-gray-500">{preset.description} · {CONTENT_TYPE_LABELS[preset.content_type]}</div>
                  </div>
                  <button
                    onClick={() => handleAddPreset(preset)}
                    disabled={exists}
                    className={`ml-2 px-2 py-1 rounded text-xs flex-shrink-0 ${
                      exists
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    {exists ? "추가됨" : "+ 추가"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="소스명"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            />
            <input
              placeholder="URL"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as SourceType })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            >
              {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={form.content_type}
              onChange={(e) => setForm({ ...form, content_type: e.target.value as ContentType })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            >
              {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{CONTENT_TYPE_LABELS[ct]}</option>)}
            </select>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              placeholder="설명 (선택)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
              {editId ? "수정" : "추가"}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-600 rounded text-sm border border-gray-200">
              취소
            </button>
          </div>
        </div>
      )}

      {/* Table (desktop) / Cards (mobile) */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">로딩 중...</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">이름</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">URL</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">유형</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">콘텐츠</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">카테고리</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">활성</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">{s.name}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 max-w-48 truncate">{s.url}</td>
                    <td className="px-3 py-2 text-xs"><span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{s.type}</span></td>
                    <td className="px-3 py-2 text-xs text-gray-700">{CONTENT_TYPE_LABELS[s.content_type]}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{s.category}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleToggle(s)}
                        className={`w-10 h-5 rounded-full transition ${s.enabled ? "bg-blue-600" : "bg-gray-300"} relative`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition ${s.enabled ? "left-5" : "left-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(s)} className="text-xs text-blue-600 hover:text-blue-800">수정</button>
                        <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 hover:text-red-800">삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {sources.map((s) => (
              <div key={s.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{s.name}</span>
                  <button
                    onClick={() => handleToggle(s)}
                    className={`w-10 h-5 rounded-full transition ${s.enabled ? "bg-blue-600" : "bg-gray-300"} relative`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition ${s.enabled ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
                <div className="text-xs text-gray-500 truncate mb-1.5">{s.url}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{s.type}</span>
                  <span className="text-gray-600">{CONTENT_TYPE_LABELS[s.content_type]}</span>
                  <span className="text-gray-400">{s.category}</span>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => handleEdit(s)} className="text-blue-600">수정</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600">삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
