"use client";

import { useState } from "react";
import NewsTable from "@/components/NewsTable";
import SourcesManager from "@/components/SourcesManager";
import KeywordsManager from "@/components/KeywordsManager";
import RecipientsManager from "@/components/RecipientsManager";
import PipelineLogs from "@/components/PipelineLogs";

const TABS = [
  { id: "preview", label: "📰 뉴스레터 미리보기" },
  { id: "sources", label: "🔗 소스 관리" },
  { id: "keywords", label: "🔑 키워드 관리" },
  { id: "recipients", label: "👥 수신자 관리" },
  { id: "logs", label: "📋 실행 로그" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("preview");

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="border-b border-[#334155] bg-[#0F172A]/95 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-[#F8FAFC]">
            🏢 ACRYL Intelligence Brief
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            AI 기반 경영정보 뉴스레터 관리자 대시보드
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[#334155] bg-[#0F172A]/80 sticky top-[73px] z-10">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "preview" && <NewsTable />}
        {activeTab === "sources" && <SourcesManager />}
        {activeTab === "keywords" && <KeywordsManager />}
        {activeTab === "recipients" && <RecipientsManager />}
        {activeTab === "logs" && <PipelineLogs />}
      </main>
    </div>
  );
}
