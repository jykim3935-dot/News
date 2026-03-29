"use client";

import { useState, useEffect } from "react";
import type { KeywordGroup, Category, ContentType } from "@/lib/supabase";
import { CATEGORIES, CONTENT_TYPES } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

const PRIORITY_LABELS: Record<number, string> = {
  1: "🔴 높음",
  2: "🟡 보통",
  3: "🟢 낮음",
};

type PresetKeywordGroup = { group_name: string; category: Category; content_types: ContentType[]; priority: number; keywords: string[]; enabled: boolean };

export default function KeywordsManager() {
  const [groups, setGroups] = useState<KeywordGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [addingPresets, setAddingPresets] = useState(false);
  const [presets, setPresets] = useState<PresetKeywordGroup[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [showAiSuggest, setShowAiSuggest] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ groups: PresetKeywordGroup[]; explanation: string } | null>(null);
  const { toast } = useToast();
  const [form, setForm] = useState({
    group_name: "",
    category: "market" as Category,
    content_types: [] as ContentType[],
    priority: 2,
    keywords: "",
    enabled: true,
  });

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/keywords");
      if (!res.ok) {
        console.error("Failed to fetch keywords:", res.status);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch keywords:", err);
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
        setPresets(data.keyword_groups || []);
      }
    } catch (err) {
      console.error("Failed to fetch presets:", err);
    }
    setPresetsLoading(false);
  };

  useEffect(() => { fetchGroups(); }, []);

  const resetForm = () => {
    setForm({ group_name: "", category: "market", content_types: [], priority: 2, keywords: "", enabled: true });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...form,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      };
      const method = editId ? "PATCH" : "POST";
      const url = editId ? `/api/keywords/${editId}` : "/api/keywords";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { toast("키워드 저장 실패", "error"); return; }
      toast(editId ? "키워드 수정 완료" : "키워드 추가 완료", "success");
    } catch { toast("키워드 저장 중 오류", "error"); return; }
    resetForm();
    fetchGroups();
  };

  const handleEdit = (g: KeywordGroup) => {
    setForm({
      group_name: g.group_name,
      category: g.category,
      content_types: g.content_types || [],
      priority: g.priority,
      keywords: g.keywords.join(", "),
      enabled: g.enabled,
    });
    setEditId(g.id);
    setShowForm(true);
  };

  const handleToggle = async (g: KeywordGroup) => {
    await fetch(`/api/keywords/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !g.enabled }),
    });
    fetchGroups();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/keywords/${id}`, { method: "DELETE" });
    fetchGroups();
  };

  const toggleContentType = (ct: ContentType) => {
    setForm((prev) => ({
      ...prev,
      content_types: prev.content_types.includes(ct)
        ? prev.content_types.filter((c) => c !== ct)
        : [...prev.content_types, ct],
    }));
  };

  const addSingleKeywordGroup = async (body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleAddPreset = async (preset: PresetKeywordGroup) => {
    const exists = groups.some((g) => g.group_name === preset.group_name);
    if (exists) {
      toast(`"${preset.group_name}" 이미 존재합니다`, "info");
      return;
    }
    const ok = await addSingleKeywordGroup(preset as unknown as Record<string, unknown>);
    if (ok) {
      toast(`"${preset.group_name}" 추가 완료`, "success");
      await fetchGroups();
    } else {
      toast(`"${preset.group_name}" 추가 실패`, "error");
    }
  };

  const handleAiSuggest = async () => {
    if (!aiQuery.trim()) { toast("검색어를 입력하세요", "info"); return; }
    setAiLoading(true);
    setAiSuggestions(null);
    try {
      const res = await fetch("/api/keywords/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery }),
      });
      if (!res.ok) { toast("AI 추천 실패", "error"); setAiLoading(false); return; }
      const data = await res.json();
      setAiSuggestions(data);
    } catch { toast("AI 추천 중 오류", "error"); }
    setAiLoading(false);
  };

  const handleAddAiGroup = async (group: PresetKeywordGroup) => {
    const exists = groups.some((g) => g.group_name === group.group_name);
    if (exists) { toast(`"${group.group_name}" 이미 존재합니다`, "info"); return; }
    const ok = await addSingleKeywordGroup(group as unknown as Record<string, unknown>);
    if (ok) {
      toast(`"${group.group_name}" 추가 완료`, "success");
      await fetchGroups();
    } else {
      toast(`"${group.group_name}" 추가 실패`, "error");
    }
  };

  const handleAddAllPresets = async () => {
    setAddingPresets(true);
    let added = 0;
    let failed = 0;
    for (const preset of presets) {
      const exists = groups.some((g) => g.group_name === preset.group_name);
      if (exists) continue;
      const ok = await addSingleKeywordGroup(preset as unknown as Record<string, unknown>);
      if (ok) { added++; } else { failed++; }
    }
    setAddingPresets(false);
    setShowPresets(false);
    await fetchGroups();
    if (failed > 0) {
      toast(`${added}개 추가, ${failed}개 실패`, "error");
    } else if (added > 0) {
      toast(`${added}개 키워드 그룹 추가 완료`, "success");
    } else {
      toast("이미 모든 프리셋이 추가되어 있습니다", "info");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">키워드 그룹 ({groups.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAiSuggest(!showAiSuggest); setShowPresets(false); }}
            className="px-3 sm:px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs sm:text-sm border border-purple-200"
          >
            🤖 AI 추천
          </button>
          <button
            onClick={() => { const next = !showPresets; setShowPresets(next); setShowAiSuggest(false); if (next) fetchPresets(); }}
            className="px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm border border-gray-200"
          >
            📋 프리셋
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm"
          >
            + 그룹 추가
          </button>
        </div>
      </div>

      {/* Presets Panel */}
      {showPresets && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-blue-900">추천 키워드 프리셋</h4>
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
              const exists = groups.some((g) => g.group_name === preset.group_name);
              return (
                <div key={preset.group_name} className="p-2 bg-white rounded border border-blue-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{preset.group_name}</span>
                    <button
                      onClick={() => handleAddPreset(preset)}
                      disabled={exists}
                      className={`px-2 py-1 rounded text-xs ${
                        exists
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      }`}
                    >
                      {exists ? "추가됨" : "+ 추가"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {preset.keywords.slice(0, 5).map((k) => (
                      <span key={k} className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">{k}</span>
                    ))}
                    {preset.keywords.length > 5 && (
                      <span className="text-xs text-gray-400">+{preset.keywords.length - 5}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Suggest Panel */}
      {showAiSuggest && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
          <h4 className="text-sm font-semibold text-purple-900">🤖 AI 키워드 추천</h4>
          <div className="flex gap-2">
            <input
              placeholder="예: 양자컴퓨팅 관련 키워드, 자율주행 AI 키워드..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAiSuggest()}
              className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded text-sm text-gray-800"
            />
            <button
              onClick={handleAiSuggest}
              disabled={aiLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded text-sm whitespace-nowrap"
            >
              {aiLoading ? "분석 중..." : "추천받기"}
            </button>
          </div>
          {aiSuggestions && (
            <div className="space-y-2">
              {aiSuggestions.explanation && (
                <p className="text-xs text-purple-700 bg-purple-100 rounded p-2">{aiSuggestions.explanation}</p>
              )}
              {aiSuggestions.groups?.map((group) => {
                const exists = groups.some((g) => g.group_name === group.group_name);
                return (
                  <div key={group.group_name} className="p-3 bg-white rounded border border-purple-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{group.group_name}</span>
                      <button
                        onClick={() => handleAddAiGroup(group)}
                        disabled={exists}
                        className={`px-2 py-1 rounded text-xs ${
                          exists ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                        }`}
                      >
                        {exists ? "추가됨" : "+ 추가"}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      {group.category} · 우선순위 {group.priority} · {group.content_types?.join(", ")}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {group.keywords?.slice(0, 8).map((k: string) => (
                        <span key={k} className="text-xs bg-purple-50 border border-purple-100 rounded px-1.5 py-0.5 text-purple-700">{k}</span>
                      ))}
                      {(group.keywords?.length || 0) > 8 && (
                        <span className="text-xs text-gray-400">+{group.keywords.length - 8}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="그룹명"
              value={form.group_name}
              onChange={(e) => setForm({ ...form, group_name: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            >
              <option value={1}>1 - 높음</option>
              <option value={2}>2 - 보통</option>
              <option value={3}>3 - 낮음</option>
            </select>
            <div className="flex flex-wrap gap-1 items-center">
              {CONTENT_TYPES.map((ct) => (
                <button
                  key={ct}
                  onClick={() => toggleContentType(ct)}
                  className={`px-2 py-1 text-xs rounded transition ${
                    form.content_types.includes(ct)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-50 border border-gray-200 text-gray-500"
                  }`}
                >
                  {ct}
                </button>
              ))}
            </div>
          </div>
          <textarea
            placeholder="키워드 (콤마로 구분: AI 인프라, GPU 클러스터, ...)"
            value={form.keywords}
            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
          />
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

      {loading ? (
        <div className="text-center py-8 text-gray-400">로딩 중...</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">그룹명</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">카테고리</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">우선순위</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">콘텐츠 유형</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">키워드</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">활성</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">{g.group_name}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{g.category}</td>
                    <td className="px-3 py-2 text-xs">{PRIORITY_LABELS[g.priority]}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {g.content_types?.length > 0 ? g.content_types.join(", ") : "전체"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {g.keywords.slice(0, 5).map((k) => (
                          <span key={k} className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">{k}</span>
                        ))}
                        {g.keywords.length > 5 && (
                          <span className="text-xs text-gray-400">+{g.keywords.length - 5}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleToggle(g)}
                        className={`w-10 h-5 rounded-full transition ${g.enabled ? "bg-blue-600" : "bg-gray-300"} relative`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition ${g.enabled ? "left-5" : "left-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(g)} className="text-xs text-blue-600 hover:text-blue-800">수정</button>
                        <button onClick={() => handleDelete(g.id)} className="text-xs text-red-600 hover:text-red-800">삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {groups.map((g) => (
              <div key={g.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{g.group_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{PRIORITY_LABELS[g.priority]}</span>
                    <button
                      onClick={() => handleToggle(g)}
                      className={`w-10 h-5 rounded-full transition ${g.enabled ? "bg-blue-600" : "bg-gray-300"} relative`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition ${g.enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-1.5">
                  {g.category} · {g.content_types?.length > 0 ? g.content_types.join(", ") : "전체"}
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {g.keywords.slice(0, 4).map((k) => (
                    <span key={k} className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">{k}</span>
                  ))}
                  {g.keywords.length > 4 && (
                    <span className="text-xs text-gray-400">+{g.keywords.length - 4}</span>
                  )}
                </div>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => handleEdit(g)} className="text-blue-600">수정</button>
                  <button onClick={() => handleDelete(g.id)} className="text-red-600">삭제</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
