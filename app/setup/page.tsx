"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [needsSQL, setNeedsSQL] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [sqlCopied, setSqlCopied] = useState(false);

  // Pre-fill with known values
  const [url, setUrl] = useState("https://nteavwxrrnybpeqzhupc.supabase.co");
  const [key, setKey] = useState("");

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.configured && d.tablesExist) setStatus("✅ 이미 설정 완료!");
        else if (d.configured) setStatus("⚠️ 연결됨, 테이블 필요");
        else setStatus("❌ 환경변수 미설정");
      })
      .catch(() => setStatus("확인 실패"));
  }, []);

  const handleSetup = async () => {
    setLoading(true);
    setSteps([]);
    setError("");
    setNeedsSQL(false);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, serviceKey: key }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      if (data.steps) setSteps(data.steps);
      if (data.needsManualSQL) setNeedsSQL(true);
      if (data.success) setStatus("✅ 설정 완료!");
    } catch {
      setError("연결 실패");
    }
    setLoading(false);
  };

  const copySQL = async () => {
    try {
      const res = await fetch("/api/setup/schema");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 3000);
    } catch {
      window.open("/api/setup/schema", "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold">Supabase 설정</h1>
        {status && <p className="text-sm bg-white rounded-lg p-3 border">{status}</p>}

        <div className="bg-white rounded-lg border p-4 space-y-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Supabase URL"
            className="w-full px-3 py-3 border rounded-lg text-sm"
          />
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="service_role key (sb_secret_...)"
            className="w-full px-3 py-3 border rounded-lg text-sm"
          />
          <button
            onClick={handleSetup}
            disabled={loading || !url || !key}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-base disabled:bg-gray-300"
          >
            {loading ? "설정 중..." : "자동 설정 시작"}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>}

        {steps.length > 0 && (
          <div className="bg-white rounded-lg border p-4 space-y-1">
            {steps.map((s, i) => <p key={i} className="text-sm">{s}</p>)}
          </div>
        )}

        {needsSQL && (
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 space-y-3">
            <p className="text-sm font-bold">수동 SQL 실행이 필요합니다:</p>
            <button
              onClick={copySQL}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold text-base"
            >
              {sqlCopied ? "✅ SQL 복사됨!" : "1. SQL 복사하기"}
            </button>
            <a
              href="https://supabase.com/dashboard/project/nteavwxrrnybpeqzhupc/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-green-600 text-white rounded-lg font-bold text-base text-center"
            >
              2. SQL Editor 열기
            </a>
            <p className="text-xs text-gray-500">SQL Editor에 붙여넣고 Run 누르면 끝!</p>
          </div>
        )}

        <Link href="/" className="block text-center text-sm text-blue-600 py-4">
          ← 메인으로
        </Link>
      </div>
    </div>
  );
}
