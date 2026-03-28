"use client";

import { useState, useEffect } from "react";
import type { KeywordGroup, Category, ContentType } from "@/lib/supabase";
import { CATEGORIES, CONTENT_TYPES } from "@/lib/supabase";

const PRIORITY_LABELS: Record<number, string> = {
  1: "🔴 높음",
  2: "🟡 보통",
  3: "🟢 낮음",
};

export default function KeywordsManager() {
  const [groups, setGroups] = useState<KeywordGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    group_name: "",
    category: "market" as Category,
    content_types: [] as ContentType[],
    priority: 2,
    keywords: "",
    enabled: true,
  });

  const fetchGroups = async () => {
    const res = await fetch("/api/keywords");
    const data = await res.json();
    setGroups(data);
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
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">키워드 그룹 ({groups.length})</h3>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          + 그룹 추가
        </button>
      </div>

      {showForm && (
        <div className="p-4 bg-[#1E293B] border border-[#334155] rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="그룹명"
              value={form.group_name}
              onChange={(e) => setForm({ ...form, group_name: e.target.value })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
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
                      : "bg-[#0F172A] border border-[#334155] text-[#94A3B8]"
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
            className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
              {editId ? "수정" : "추가"}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-[#334155] text-[#94A3B8] rounded text-sm">
              취소
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-[#64748B]">로딩 중...</div>
      ) : (
        <div className="border border-[#334155] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0F172A] border-b-2 border-[#334155]">
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">그룹명</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">카테고리</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">우선순위</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">콘텐츠 유형</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">키워드</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">활성</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">작업</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-b border-[#334155] hover:bg-[#1E293B]/50">
                  <td className="px-3 py-2 text-sm font-medium">{g.group_name}</td>
                  <td className="px-3 py-2 text-xs text-[#94A3B8]">{g.category}</td>
                  <td className="px-3 py-2 text-xs">{PRIORITY_LABELS[g.priority]}</td>
                  <td className="px-3 py-2 text-xs text-[#94A3B8]">
                    {g.content_types?.length > 0 ? g.content_types.join(", ") : "전체"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {g.keywords.slice(0, 5).map((k) => (
                        <span key={k} className="text-xs bg-[#0F172A] border border-[#475569] rounded px-1.5 py-0.5 text-[#94A3B8]">{k}</span>
                      ))}
                      {g.keywords.length > 5 && (
                        <span className="text-xs text-[#64748B]">+{g.keywords.length - 5}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleToggle(g)}
                      className={`w-10 h-5 rounded-full transition ${g.enabled ? "bg-blue-600" : "bg-[#334155]"} relative`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${g.enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(g)} className="text-xs text-blue-400 hover:text-blue-300">수정</button>
                      <button onClick={() => handleDelete(g.id)} className="text-xs text-red-400 hover:text-red-300">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
