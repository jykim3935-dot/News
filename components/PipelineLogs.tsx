"use client";

import { useState, useEffect } from "react";
import type { PipelineRun } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  running: { bg: "bg-blue-500/20", text: "text-blue-400" },
  completed: { bg: "bg-green-500/20", text: "text-green-400" },
  failed: { bg: "bg-red-500/20", text: "text-red-400" },
};

export default function PipelineLogs() {
  const [logs, setLogs] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    const res = await fetch("/api/pipeline/logs");
    const data = await res.json();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  // Auto-refresh when a pipeline is running
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
        <h3 className="text-lg font-semibold">실행 로그 ({logs.length})</h3>
        <button
          onClick={handleRun}
          disabled={running}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-sm"
        >
          {running ? "실행 중..." : "🔄 수동 실행"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[#64748B]">로딩 중...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-[#64748B]">실행 이력이 없습니다.</div>
      ) : (
        <div className="border border-[#334155] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0F172A] border-b-2 border-[#334155]">
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">시작 시간</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">상태</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">기사 수</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">소요 시간</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">배치 ID</th>
                <th className="px-3 py-2 text-left text-[#64748B] text-xs font-semibold">에러</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const style = STATUS_STYLES[log.status] || STATUS_STYLES.running;
                return (
                  <tr key={log.id} className="border-b border-[#334155] hover:bg-[#1E293B]/50">
                    <td className="px-3 py-2 text-sm text-[#94A3B8]">{formatTime(log.started_at)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs ${style.bg} ${style.text} px-2 py-0.5 rounded`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">{log.articles_count}</td>
                    <td className="px-3 py-2 text-sm text-[#94A3B8]">{formatDuration(log)}</td>
                    <td className="px-3 py-2 text-xs text-[#64748B] font-mono">{log.batch_id.slice(0, 8)}...</td>
                    <td className="px-3 py-2 text-xs text-red-400 max-w-xs truncate">{log.error || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
