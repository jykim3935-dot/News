import type { Metadata } from "next";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACRYL Intelligence Brief",
  description: "AI 기반 경영정보 뉴스레터 자동화 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen bg-[#0F172A] text-[#E2E8F0] antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
