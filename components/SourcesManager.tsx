"use client";

import { useState, useEffect } from "react";
import type { Source, ContentType, Category, SourceType } from "@/lib/supabase";
import { CONTENT_TYPES, CATEGORIES } from "@/lib/supabase";
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

const SOURCE_TYPES: SourceType[] = ["rss", "api", "websearch", "crawl"];

type PresetSource = Omit<Source, "id" | "created_at">;

export default function SourcesManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [addingPresets, setAddingPresets] = useState(false);
  const [presets, setPresets] = useState<PresetSource[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ sources: Omit<Source, "id" | "created_at">[]; explanation: string } | null>(null);
  const { toast } = useToast();
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
    try {
      const res = await fetch("/api/sources");
      if (!res.ok) {
        console.error("Failed to fetch sources:", res.status);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch sources:", err);
    }
    setLoading(false);
  };

  const fetchPresets = async () => {
    if (presets.length > 0) return;
    setPresetsLoading(true);
    try {
      const res = await fetch("/api/presets/apply");
      if (res.ok) {
        const data = await res.json();
        setPresets(data.sources || []);
      }
    } catch (err) {
      console.error("Failed to fetch presets:", err);
    }
    setPresetsLoading(false);
  };

  useEffect(() => { fetchSources(); }, []);

  const resetForm = () => {
    setForm({ name: "", url: "", type: "rss", content_type: "news", category: "market", description: "", enabled: true });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    try {
      const method = editId ? "PATCH" : "POST";
      const url = editId ? `/api/sources/${editId}` : "/api/sources";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) {
        toast("소스 저장 실패", "error");
        return;
      }
      toast(editId ? "소스 수정 완료" : "소스 추가 완료", "success");
      resetForm();
      await fetchSources();
    } catch {
      toast("소스 저장 중 오류 발생", "error");
    }
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

  const addSingleSource = async (body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleAiSuggest = async () => {
    if (!aiQuery.trim()) return;
    setAiSuggesting(true);
    setAiSuggestions(null);
    try {
      const res = await fetch("/api/sources/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery }),
      });
      const data = await res.json();
      if (data.sources) {
        setAiSuggestions({ sources: data.sources, explanation: data.explanation || "" });
      } else {
        toast(data.error || "AI 추천 실패", "error");
      }
    } catch {
      toast("AI 추천 중 오류", "error");
    }
    setAiSuggesting(false);
  };

  const handleAddAiSource = async (source: Omit<Source, "id" | "created_at">) => {
    const exists = sources.some((s) => s.name === source.name);
    if (exists) { toast(`"${source.name}" 이미 존재합니다`, "info"); return; }
    const ok = await addSingleSource({ ...source, enabled: true } as unknown as Record<string, unknown>);
    if (ok) {
      toast(`"${source.name}" 추가 완료`, "success");
      await fetchSources();
    } else {
      toast(`"${source.name}" 추가 실패`, "error");
    }
  };

  const handleAddPreset = async (preset: PresetSource) => {
    const exists = sources.some((s) => s.name === preset.name);
    if (exists) {
      toast(`"${preset.name}" 이미 존재합니다`, "info");
      return;
    }
    const ok = await addSingleSource(preset as unknown as Record<string, unknown>);
    if (ok) {
      toast(`"${preset.name}" 추가 완료`, "success");
      await fetchSources();
    } else {
      toast(`"${preset.name}" 추가 실패`, "error");
    }
  };

  const handleAddAllPresets = async () => {
    setAddingPresets(true);
    let added = 0;
    let failed = 0;
    for (const preset of presets) {
      const exists = sources.some((s) => s.name === preset.name);
      if (exists) { continue; }
      const ok = await addSingleSource(preset as unknown as Record<string, unknown>);
      if (ok) { added++; } else { failed++; }
    }
    setAddingPresets(false);
    setShowPresets(false);
    await fetchSources();
    if (failed > 0) {
      toast(`${added}개 추가, ${failed}개 실패`, "error");
    } else if (added > 0) {
      toast(`${added}개 소스 추가 완료`, "success");
    } else {
      toast("이미 모든 프리셋이 추가되어 있습니다", "info");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">수집 소스 ({sources.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={() => { const next = !showPresets; setShowPresets(next); if (next) fetchPresets(); }}
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

      {/* AI Source Suggestion */}
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <h4 className="text-sm font-semibold text-purple-900 mb-2">AI 소스 추천</h4>
        <div className="flex gap-2">
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAiSuggest()}
            placeholder="예: 반도체 수출 뉴스, 의료 AI 규제, NVIDIA 블로그..."
            className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded text-sm text-gray-800"
          />
          <button
            onClick={handleAiSuggest}
            disabled={aiSuggesting || !aiQuery.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded text-xs sm:text-sm whitespace-nowrap"
          >
            {aiSuggesting ? "검색 중..." : "추천"}
          </button>
        </div>
        {aiSuggestions && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-purple-700">{aiSuggestions.explanation}</p>
            {aiSuggestions.sources.map((s, i) => {
              const exists = sources.some((ex) => ex.name === s.name);
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-white rounded border border-purple-100">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{s.type} · {s.content_type}</span>
                    <p className="text-xs text-gray-500 truncate">{s.description}</p>
                  </div>
                  <button
                    onClick={() => handleAddAiSource(s)}
                    disabled={exists}
                    className={`ml-2 px-2 py-1 rounded text-xs flex-shrink-0 ${
                      exists ? "bg-gray-100 text-gray-400" : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                    }`}
                  >
                    {exists ? "추가됨" : "+ 추가"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Presets Panel */}
      {showPresets && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-blue-900">추천 소스 프리셋</h4>
            <button
              onClick={handleAddAllPresets}
              disabled={addingPresets}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded text-xs"
            >
              {addingPresets ? "추가 중..." : "전체 추가"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presetsLoading && <p className="text-sm text-blue-600 col-span-2">로딩 중...</p>}
            {presets.map((preset) => {
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
