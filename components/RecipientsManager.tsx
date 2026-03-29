"use client";

import { useState, useEffect } from "react";
import type { Recipient } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

export default function RecipientsManager() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "" });
  const { toast } = useToast();

  const fetchRecipients = async () => {
    try {
      const res = await fetch("/api/recipients");
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setRecipients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch recipients:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRecipients(); }, []);

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { toast("수신자 추가 실패", "error"); return; }
      toast("수신자 추가 완료", "success");
      setForm({ name: "", email: "", role: "" });
      setShowForm(false);
      await fetchRecipients();
    } catch {
      toast("수신자 추가 중 오류", "error");
    }
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
      if (data.status === "completed") {
        toast("테스트 발송 완료!", "success");
      } else {
        toast(`실패: ${data.errors?.join(", ")}`, "error");
      }
    } catch {
      toast("테스트 발송 실패", "error");
    }
    setTestRunning(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">수신자 ({recipients.length})</h3>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm"
        >
          + 수신자 추가
        </button>
      </div>

      {/* Test Send */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <input
          placeholder="테스트 발송 이메일"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
        />
        <button
          onClick={handleTestSend}
          disabled={testRunning || !testEmail}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white rounded text-sm"
        >
          {testRunning ? "발송 중..." : "📧 테스트 발송"}
        </button>
      </div>

      {showForm && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              placeholder="이름"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            />
            <input
              placeholder="이메일"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            />
            <input
              placeholder="역할 (CEO, BD, IR 등)"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">추가</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded text-sm border border-gray-200">취소</button>
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
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">이름</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">이메일</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">역할</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">활성</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">{r.name}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{r.email}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{r.role || "-"}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleToggle(r)}
                        className={`w-10 h-5 rounded-full transition ${r.enabled ? "bg-blue-600" : "bg-gray-300"} relative`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition ${r.enabled ? "left-5" : "left-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-red-600 hover:text-red-800">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {recipients.map((r) => (
              <div key={r.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{r.name}</span>
                  <button
                    onClick={() => handleToggle(r)}
                    className={`w-10 h-5 rounded-full transition ${r.enabled ? "bg-blue-600" : "bg-gray-300"} relative`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition ${r.enabled ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
                <div className="text-xs text-gray-500">{r.email}</div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-400">{r.role || "-"}</span>
                  <button onClick={() => handleDelete(r.id)} className="text-xs text-red-600">삭제</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
