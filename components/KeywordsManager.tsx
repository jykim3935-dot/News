"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import type { KeywordGroup, Category, ContentType } from "@/lib/supabase";
import { CATEGORIES, CONTENT_TYPES } from "@/lib/supabase";

const PRIORITY_LABELS: Record<number, string> = {
  1: "🔴 높음",
  2: "🟡 보통",
  3: "🟢 낮음",
};

const PRESET_KEYWORD_GROUPS: { group_name: string; category: Category; content_types: ContentType[]; priority: number; keywords: string[]; enabled: boolean }[] = [
  {
    group_name: "AI/인공지능",
    category: "tech",
    content_types: ["news", "research", "blog"],
    priority: 1,
    keywords: ["AI", "인공지능", "생성형AI", "LLM", "GPT", "Claude", "머신러닝", "딥러닝", "AI 에이전트", "AI 반도체"],
    enabled: true,
  },
  {
    group_name: "데이터 인프라",
    category: "tech",
    content_types: ["news", "report", "blog"],
    priority: 1,
    keywords: ["데이터 거버넌스", "데이터 카탈로그", "메타데이터", "데이터 품질", "데이터 레이크", "데이터 파이프라인", "ETL", "데이터 리니지"],
    enabled: true,
  },
  {
    group_name: "클라우드/SaaS",
    category: "tech",
    content_types: ["news", "report", "global"],
    priority: 2,
    keywords: ["클라우드", "SaaS", "AWS", "Azure", "GCP", "쿠버네티스", "마이크로서비스", "서버리스"],
    enabled: true,
  },
  {
    group_name: "금융 규제/정책",
    category: "regulation",
    content_types: ["news", "government"],
    priority: 1,
    keywords: ["금융규제", "데이터3법", "마이데이터", "오픈뱅킹", "전자금융", "디지털자산", "가상자산", "CBDC"],
    enabled: true,
  },
  {
    group_name: "투자/M&A",
    category: "investment",
    content_types: ["news", "investment"],
    priority: 2,
    keywords: ["투자유치", "시리즈", "M&A", "IPO", "기업공개", "벤처투자", "VC", "스타트업 인수"],
    enabled: true,
  },
  {
    group_name: "경쟁사 동향",
    category: "competitive",
    content_types: ["news", "report"],
    priority: 1,
    keywords: ["Collibra", "Alation", "Informatica", "Atlan", "데이터독", "스노우플레이크", "데이터브릭스", "dbt"],
    enabled: true,
  },
  {
    group_name: "디지털 전환",
    category: "market",
    content_types: ["news", "consulting", "report"],
    priority: 2,
    keywords: ["디지털 전환", "DX", "DT", "스마트팩토리", "RPA", "자동화", "업무혁신"],
    enabled: true,
  },
  {
    group_name: "보안/컴플라이언스",
    category: "regulation",
    content_types: ["news", "government"],
    priority: 2,
    keywords: ["정보보안", "개인정보보호", "GDPR", "ISMS", "제로트러스트", "랜섬웨어", "사이버보안"],
    enabled: true,
  },
];

const CONTENT_TYPE_LABELS: Record<string, string> = {
  news: "뉴스", report: "보고서", research: "학술", consulting: "컨설팅",
  government: "정부정책", global: "글로벌", investment: "투자", blog: "블로그",
};

export default function KeywordsManager() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<KeywordGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [addingPresets, setAddingPresets] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<{ group_name: string; category: Category; content_types: ContentType[]; priority: number; keywords: string[]; enabled: boolean }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);
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
      const data = await res.json();
      if (data.error) {
        setDbError(data.error);
        setGroups([]);
      } else {
        setDbError(null);
        setGroups(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setDbError("서버 연결 실패: " + (err instanceof Error ? err.message : String(err)));
      setGroups([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchGroups(); }, []);

  const resetForm = () => {
    setForm({ group_name: "", category: "market", content_types: [], priority: 2, keywords: "", enabled: true });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    const payload = {
      ...form,
      keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
    };
    const method = editId ? "PATCH" : "POST";
    const url = editId ? `/api/keywords/${editId}` : "/api/keywords";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.error) {
        toast(`저장 실패: ${data.error}`, "error");
        return;
      }
      toast(editId ? "키워드 그룹 수정 완료" : "키워드 그룹 추가 완료", "success");
      resetForm();
      fetchGroups();
    } catch (err) {
      toast(`저장 실패: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
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

  const addKeywordGroup = async (body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        toast(`추가 실패: ${data.error}`, "error");
        return false;
      }
      return true;
    } catch (err) {
      toast(`추가 실패: ${err instanceof Error ? err.message : String(err)}`, "error");
      return false;
    }
  };

  const handleAddPreset = async (preset: typeof PRESET_KEYWORD_GROUPS[number]) => {
    const exists = groups.some((g) => g.group_name === preset.group_name);
    if (exists) {
      toast(`"${preset.group_name}"은 이미 추가되어 있습니다.`, "info");
      return;
    }
    const ok = await addKeywordGroup(preset);
    if (ok) {
      toast(`"${preset.group_name}" 추가 완료`, "success");
      fetchGroups();
    }
  };

  const handleAddAllPresets = async () => {
    setAddingPresets(true);
    let added = 0;
    let failed = 0;
    for (const preset of PRESET_KEYWORD_GROUPS) {
      const exists = groups.some((g) => g.group_name === preset.group_name);
      if (exists) continue;
      const ok = await addKeywordGroup(preset);
      if (ok) added++;
      else failed++;
    }
    setAddingPresets(false);
    if (added > 0) toast(`${added}개 키워드 그룹 추가 완료${failed > 0 ? `, ${failed}개 실패` : ""}`, added > 0 ? "success" : "error");
    else if (failed > 0) toast(`${failed}개 키워드 그룹 추가 실패`, "error");
    else toast("추가할 새 키워드 그룹이 없습니다.", "info");
    setShowPresets(false);
    fetchGroups();
  };

  const handleAiSuggest = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery, type: "keywords" }),
      });
      const data = await res.json();
      if (data.error) {
        toast(`AI 추천 실패: ${data.error}`, "error");
      } else {
        const suggestions = data.suggestions || [];
        setAiSuggestions(suggestions);
        if (suggestions.length === 0) toast("추천 결과가 없습니다.", "info");
      }
    } catch (err) {
      toast(`AI 추천 실패: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
    setAiLoading(false);
  };

  const handleAddAiSuggestion = async (suggestion: typeof aiSuggestions[number]) => {
    const exists = groups.some((g) => g.group_name === suggestion.group_name);
    if (exists) {
      toast("이미 추가된 키워드 그룹입니다.", "info");
      return;
    }
    const ok = await addKeywordGroup(suggestion);
    if (ok) {
      toast(`"${suggestion.group_name}" 추가 완료`, "success");
      fetchGroups();
    }
  };

  const handleAddAllAiSuggestions = async () => {
    let added = 0;
    for (const s of aiSuggestions) {
      const exists = groups.some((g) => g.group_name === s.group_name);
      if (exists) continue;
      const ok = await addKeywordGroup(s);
      if (ok) added++;
    }
    toast(`${added}개 AI 추천 키워드 추가 완료`, added > 0 ? "success" : "info");
    setAiSuggestions([]);
    setShowAi(false);
    fetchGroups();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">키워드 그룹 ({groups.length})</h3>
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
            + 그룹 추가
          </button>
        </div>
      </div>

      {/* DB Error Banner */}
      {dbError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm font-semibold text-red-800">DB 연결 오류</div>
          <div className="text-xs text-red-600 mt-1">{dbError}</div>
          <div className="text-xs text-red-500 mt-2">
            Supabase SQL Editor에서 schema.sql → schema-v2.sql → schema-v3-production.sql 순서로 실행하세요.
          </div>
        </div>
      )}

      {/* AI Suggestion Panel */}
      {showAi && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
          <h4 className="text-sm font-semibold text-purple-900">🤖 AI 키워드 추천</h4>
          <div className="flex gap-2">
            <input
              placeholder="예: 반도체 공급망, 의료AI 규제, 클라우드 보안..."
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
                <span className="text-xs text-purple-700">{aiSuggestions.length}개 키워드 그룹 추천</span>
                <button
                  onClick={handleAddAllAiSuggestions}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
                >
                  전체 추가
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {aiSuggestions.map((s, i) => {
                  const exists = groups.some((g) => g.group_name === s.group_name);
                  return (
                    <div key={i} className="p-2 bg-white rounded border border-purple-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{s.group_name}</span>
                        <button
                          onClick={() => handleAddAiSuggestion(s)}
                          disabled={exists}
                          className={`px-2 py-1 rounded text-xs ${
                            exists
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                          }`}
                        >
                          {exists ? "추가됨" : "+ 추가"}
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        {s.category} · {s.content_types?.map((ct) => CONTENT_TYPE_LABELS[ct] || ct).join(", ") || "전체"}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.keywords.slice(0, 6).map((k) => (
                          <span key={k} className="text-xs bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5 text-purple-700">{k}</span>
                        ))}
                        {s.keywords.length > 6 && (
                          <span className="text-xs text-purple-400">+{s.keywords.length - 6}</span>
                        )}
                      </div>
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
            <h4 className="text-sm font-semibold text-blue-900">추천 키워드 프리셋</h4>
            <button
              onClick={handleAddAllPresets}
              disabled={addingPresets}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs disabled:opacity-50"
            >
              {addingPresets ? "추가 중..." : "전체 추가"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_KEYWORD_GROUPS.map((preset) => {
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
