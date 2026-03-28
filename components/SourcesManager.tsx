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

export default function SourcesManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">수집 소스 ({sources.length})</h3>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          + 소스 추가
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 bg-[#1E293B] border border-[#334155] rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="소스명"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
            />
            <input
              placeholder="URL"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as SourceType })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
            >
              {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={form.content_type}
              onChange={(e) => setForm({ ...form, content_type: e.target.value as ContentType })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
            >
              {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{CONTENT_TYPE_LABELS[ct]}</option>)}
            </select>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              placeholder="설명 (선택)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
            />
          </div>
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

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-[#64748B]">로딩 중...</div>
      ) : (
        <div className="border border-[#334155] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0F172A] border-b-2 border-[#334155]">
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">이름</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">URL</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">유형</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">콘텐츠</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">카테고리</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">활성</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">작업</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b border-[#334155] hover:bg-[#1E293B]/50">
                  <td className="px-3 py-2 text-sm">{s.name}</td>
                  <td className="px-3 py-2 text-xs text-[#94A3B8] max-w-48 truncate">{s.url}</td>
                  <td className="px-3 py-2 text-xs"><span className="bg-[#334155] px-1.5 py-0.5 rounded">{s.type}</span></td>
                  <td className="px-3 py-2 text-xs">{CONTENT_TYPE_LABELS[s.content_type]}</td>
                  <td className="px-3 py-2 text-xs text-[#94A3B8]">{s.category}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleToggle(s)}
                      className={`w-10 h-5 rounded-full transition ${s.enabled ? "bg-blue-600" : "bg-[#334155]"} relative`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${s.enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(s)} className="text-xs text-blue-400 hover:text-blue-300">수정</button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-300">삭제</button>
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
