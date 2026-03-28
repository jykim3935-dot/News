"use client";

import { useState, useEffect } from "react";
import type { Recipient } from "@/lib/supabase";

export default function RecipientsManager() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "" });

  const fetchRecipients = async () => {
    const res = await fetch("/api/recipients");
    const data = await res.json();
    setRecipients(data);
    setLoading(false);
  };

  useEffect(() => { fetchRecipients(); }, []);

  const handleSubmit = async () => {
    await fetch("/api/recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", email: "", role: "" });
    setShowForm(false);
    fetchRecipients();
  };

  const handleToggle = async (r: Recipient) => {
    await fetch(`/api/recipients/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !r.enabled }),
    });
    fetchRecipients();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/recipients/${id}`, { method: "DELETE" });
    fetchRecipients();
  };

  const handleTestSend = async () => {
    if (!testEmail) return;
    setTestRunning(true);
    try {
      const res = await fetch("/api/pipeline/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await res.json();
      alert(data.status === "completed" ? "테스트 발송 완료!" : `실패: ${data.errors?.join(", ")}`);
    } catch {
      alert("테스트 발송 실패");
    }
    setTestRunning(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">수신자 ({recipients.length})</h3>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          + 수신자 추가
        </button>
      </div>

      {/* Test Send */}
      <div className="flex gap-2 items-center p-3 bg-[#1E293B] border border-[#334155] rounded-lg">
        <input
          placeholder="테스트 발송 이메일"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          className="flex-1 px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
        />
        <button
          onClick={handleTestSend}
          disabled={testRunning || !testEmail}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-600/50 text-white rounded text-sm"
        >
          {testRunning ? "발송 중..." : "📧 테스트 발송"}
        </button>
      </div>

      {showForm && (
        <div className="p-4 bg-[#1E293B] border border-[#334155] rounded-lg space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="이름"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
            />
            <input
              placeholder="이메일"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
            />
            <input
              placeholder="역할 (CEO, BD, IR 등)"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-sm text-[#E2E8F0]"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">추가</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-[#334155] text-[#94A3B8] rounded text-sm">취소</button>
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
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">이름</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">이메일</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">역할</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">활성</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">작업</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id} className="border-b border-[#334155] hover:bg-[#1E293B]/50">
                  <td className="px-3 py-2 text-sm">{r.name}</td>
                  <td className="px-3 py-2 text-sm text-[#94A3B8]">{r.email}</td>
                  <td className="px-3 py-2 text-xs text-[#94A3B8]">{r.role || "-"}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleToggle(r)}
                      className={`w-10 h-5 rounded-full transition ${r.enabled ? "bg-blue-600" : "bg-[#334155]"} relative`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${r.enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-300">삭제</button>
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
