"use client";

import { useState, useCallback } from "react";
import NewsTable from "@/components/NewsTable";
import SourcesManager from "@/components/SourcesManager";
import KeywordsManager from "@/components/KeywordsManager";
import RecipientsManager from "@/components/RecipientsManager";
import PipelineLogs from "@/components/PipelineLogs";

const TABS = [
  { id: "preview", label: "뉴스레터", icon: "📰" },
  { id: "sources", label: "소스", icon: "🔗" },
  { id: "keywords", label: "키워드", icon: "🔑" },
  { id: "recipients", label: "수신자", icon: "👥" },
  { id: "logs", label: "로그", icon: "📋" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("preview");
  const [applyingPresets, setApplyingPresets] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const applyAllPresets = useCallback(async () => {
    if (applyingPresets) return;
    setApplyingPresets(true);
    try {
      const res = await fetch("/api/presets/apply", { method: "POST" });
      const data = await res.json();
      const msg = `소스: ${data.sources.added}개 추가 (${data.sources.skipped}개 기존), 키워드: ${data.keywords.added}개 추가 (${data.keywords.skipped}개 기존)`;
      alert(data.success ? `프리셋 반영 완료!\n${msg}` : `일부 오류 발생\n${msg}\n${[...data.sources.errors, ...data.keywords.errors].join("\n")}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert("프리셋 반영 실패: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setApplyingPresets(false);
    }
  }, [applyingPresets]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
              ACRYL Intelligence Brief
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              AI 기반 경영정보 뉴스레터 관리자 대시보드
            </p>
          </div>
          <button
            onClick={applyAllPresets}
            disabled={applyingPresets}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 rounded-lg transition whitespace-nowrap"
          >
            {applyingPresets ? "반영 중..." : "프리셋 전체 반영"}
          </button>
        </div>
      </header>

      {/* Tabs - horizontal scroll on mobile */}
      <div className="border-b border-gray-200 bg-white sticky top-[57px] sm:top-[73px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition border-b-2 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="sm:hidden">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.icon} {tab.label}</span>
                <span className="sm:hidden text-[10px] block">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {activeTab === "preview" && <NewsTable />}
        {activeTab === "sources" && <SourcesManager key={`sources-${refreshKey}`} />}
        {activeTab === "keywords" && <KeywordsManager key={`keywords-${refreshKey}`} />}
        {activeTab === "recipients" && <RecipientsManager />}
        {activeTab === "logs" && <PipelineLogs />}
      </main>
    </div>
  );
}
