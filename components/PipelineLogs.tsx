"use client";

import { useState, useEffect } from "react";
import type { PipelineRun } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  running: { bg: "bg-blue-100", text: "text-blue-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
  failed: { bg: "bg-red-100", text: "text-red-700" },
};

export default function PipelineLogs() {
  const [logs, setLogs] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/pipeline/logs");
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  useEffect(() => {
    const hasRunning = logs.some((l) => l.status === "running");
    if (!hasRunning) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [logs]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/pipeline/run", { method: "POST" });
      const data = await res.json();
      await fetchLogs();
      if (data.status === "completed") {
        toast(`파이프라인 완료: ${data.articlesCount}건 수집`, "success");
      } else {
        toast(`파이프라인 실패: ${data.errors?.join(", ")}`, "error");
      }
    } catch {
      toast("파이프라인 실행 실패", "error");
    }
    setRunning(false);
  };

  const formatDuration = (run: PipelineRun) => {
    if (!run.completed_at) return "-";
    const start = new Date(run.started_at).getTime();
    const end = new Date(run.completed_at).getTime();
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}초`;
    return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">실행 로그 ({logs.length})</h3>
        <button
          onClick={handleRun}
          disabled={running}
          className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs sm:text-sm"
        >
          {running ? "실행 중..." : "🔄 수동 실행"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">로딩 중...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-400">실행 이력이 없습니다.</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">시작 시간</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">상태</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">기사 수</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">소요 시간</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">배치 ID</th>
                  <th className="px-3 py-2 text-left text-gray-500 text-xs font-semibold">에러</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const style = STATUS_STYLES[log.status] || STATUS_STYLES.running;
                  return (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-500">{formatTime(log.started_at)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs ${style.bg} ${style.text} px-2 py-0.5 rounded`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">{log.articles_count}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{formatDuration(log)}</td>
                      <td className="px-3 py-2 text-xs text-gray-400 font-mono">{log.batch_id.slice(0, 8)}...</td>
                      <td className="px-3 py-2 text-xs text-red-600 max-w-xs truncate">{log.error || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {logs.map((log) => {
              const style = STATUS_STYLES[log.status] || STATUS_STYLES.running;
              return (
                <div key={log.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">{formatTime(log.started_at)}</span>
                    <span className={`text-xs ${style.bg} ${style.text} px-2 py-0.5 rounded`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-900 font-medium">{log.articles_count}건</span>
                    <span className="text-gray-400">{formatDuration(log)}</span>
                  </div>
                  {log.error && (
                    <div className="text-xs text-red-600 mt-1 truncate">{log.error}</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
