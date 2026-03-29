import type { Article, Trend } from "./supabase";

/* ─── Helpers ─── */

function urgencyColor(u: string | null): string {
  switch (u) {
    case "red": return "#dc2626";
    case "yellow": return "#d97706";
    case "green": return "#059669";
    default: return "#a1a1aa";
  }
}

export function categoryLabel(c: string | null): string {
  const m: Record<string, string> = {
    competitive: "경쟁", market: "시장", regulation: "규제",
    tech: "기술", customer: "고객", investment: "투자",
  };
  return c ? m[c] || c : "";
}

export function contentTypeLabel(ct: string | null): string {
  const m: Record<string, string> = {
    news: "뉴스", report: "보고서", research: "학술",
    consulting: "컨설팅", government: "정부", global: "글로벌",
    investment: "투자", blog: "블로그",
  };
  return ct ? m[ct] || ct : "";
}

export function displayTitle(a: Article): string {
  return a.title_ko || a.title;
}

export function displaySummary(a: Article): string {
  return a.summary_ko || a.summary || "";
}

/* ─── Executive Brief ─── */

function renderBrief(brief: string): string {
  if (!brief || brief.includes("브리프 생성") || brief.includes("수집된 기사가")) return "";

  const tagColors: Record<string, string> = {
    "긴급 대응": "#dc2626",
    "시장 시그널": "#d97706",
    "기회 포착": "#18181b",
    "주간 맥락": "#71717a",
  };

  const tags = Object.keys(tagColors);
  const regex = new RegExp(
    `\\[(${tags.join("|")})\\]\\s*(.+?)(?=\\[(?:${tags.join("|")})\\]|$)`,
    "gs"
  );

  const sections: string[] = [];
  let match;
  while ((match = regex.exec(brief)) !== null) {
    const tag = match[1];
    const content = match[2].trim();
    if (content) {
      sections.push(
        `<p style="margin:0 0 8px 0;"><strong style="color:${tagColors[tag]};">[${tag}]</strong> ${content}</p>`
      );
    }
  }

  // Fallback: no tags found
  if (sections.length === 0) {
    sections.push(`<p style="margin:0;">${brief}</p>`);
  }

  return `
    <div style="padding:20px 24px;border-bottom:1px solid #e4e4e7;">
      <div style="font-size:12px;font-weight:700;color:#18181b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">AI 핵심 요약</div>
      <div style="font-size:13px;line-height:1.8;color:#27272a;">${sections.join("")}</div>
    </div>`;
}

/* ─── Article Row ─── */

function renderArticleRow(a: Article): string {
  const title = displayTitle(a);
  const score = a.relevance_score || 0;
  const color = urgencyColor(a.urgency);

  const meta = [a.source, contentTypeLabel(a.content_type), categoryLabel(a.category)]
    .filter(Boolean).join(" &middot; ");

  const mainRow = `
    <tr style="border-bottom:1px solid ${a.deep_summary ? "transparent" : "#f4f4f5"};">
      <td style="padding:8px 6px 8px 24px;width:8px;vertical-align:top;">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};margin-top:4px;"></div>
      </td>
      <td style="padding:8px 6px;width:28px;vertical-align:top;text-align:center;font-weight:700;font-size:12px;color:${color};">${score}</td>
      <td style="padding:8px 6px;vertical-align:top;">
        <a href="${a.url}" style="color:#18181b;text-decoration:none;font-weight:600;font-size:13px;" target="_blank">${title}</a>
        <div style="color:#71717a;font-size:11px;margin-top:1px;">${meta}${a.published_at ? ` &middot; ${a.published_at}` : ""}</div>
        ${displaySummary(a) ? `<div style="color:#52525b;font-size:11px;margin-top:3px;line-height:1.5;">${displaySummary(a)}</div>` : ""}
      </td>
      <td style="padding:8px 24px 8px 12px;vertical-align:top;color:#52525b;font-size:11px;max-width:220px;line-height:1.4;">
        ${a.impact_comment || ""}
      </td>
    </tr>`;

  if (!a.deep_summary && (!a.key_findings || a.key_findings.length === 0)) {
    return mainRow;
  }

  const findings = a.key_findings?.length
    ? a.key_findings.map((f) => f).join(" / ")
    : "";
  const actions = a.action_items?.length
    ? a.action_items.map((act) => act).join(" / ")
    : "";

  const detailRow = `
    <tr style="border-bottom:1px solid #e4e4e7;">
      <td></td><td></td>
      <td colspan="2" style="padding:0 24px 10px 6px;">
        <div style="font-size:11px;color:#52525b;line-height:1.6;padding:8px 10px;background:#fafafa;border-left:2px solid #d4d4d8;">
          ${a.deep_summary ? `<div style="margin-bottom:4px;">${a.deep_summary}</div>` : ""}
          ${findings ? `<div style="color:#18181b;">-- ${findings}</div>` : ""}
          ${actions ? `<div style="color:#2563eb;margin-top:2px;">-> ${actions}</div>` : ""}
        </div>
      </td>
    </tr>`;

  return mainRow + detailRow;
}

/* ─── Urgency Group ─── */

function renderUrgencyGroup(label: string, color: string, articles: Article[]): string {
  if (articles.length === 0) return "";

  const sorted = [...articles].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

  return `
    <div style="padding:14px 24px 0;">
      <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.5px;padding-bottom:6px;border-bottom:1px solid ${color}20;">
        ${label} (${articles.length})
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;" cellpadding="0" cellspacing="0">
      ${sorted.map((a) => renderArticleRow(a)).join("")}
    </table>`;
}

/* ─── Trends ─── */

function renderTrends(trends: Trend[]): string {
  if (!trends || trends.length === 0) return "";

  const strengthLabel = (s: string) => {
    switch (s) {
      case "rising": return `<span style="color:#dc2626;font-weight:600;">급부상</span>`;
      case "emerging": return `<span style="color:#d97706;font-weight:600;">신흥</span>`;
      case "stable": return `<span style="color:#71717a;font-weight:600;">지속</span>`;
      default: return "";
    }
  };

  const items = trends.map((t) => {
    const desc = t.trend_description.length > 120
      ? t.trend_description.slice(0, 120) + "..."
      : t.trend_description;
    return `<div style="margin-bottom:6px;">
      ${strengthLabel(t.strength)} <strong>${t.trend_title}</strong> &mdash; ${desc}
      <span style="color:#a1a1aa;font-size:10px;margin-left:4px;">${t.related_article_ids?.length || 0}건</span>
    </div>`;
  }).join("");

  return `
    <div style="padding:16px 24px;border-top:1px solid #e4e4e7;">
      <div style="font-size:11px;font-weight:700;color:#18181b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">트렌드 (${trends.length})</div>
      <div style="font-size:12px;color:#27272a;line-height:1.7;">${items}</div>
    </div>`;
}

/* ─── Main ─── */

export interface NewsletterData {
  articles: Article[];
  date: string;
  executiveBrief?: string;
  trends?: Trend[];
}

export function renderNewsletter(data: NewsletterData): string {
  const { articles, date, executiveBrief, trends } = data;

  const total = articles.length;
  const redCount = articles.filter((a) => a.urgency === "red").length;
  const yellowCount = articles.filter((a) => a.urgency === "yellow").length;
  const greenCount = total - redCount - yellowCount;
  const deepCount = articles.filter((a) => a.deep_summary).length;
  const avgScore = total > 0
    ? (articles.reduce((s, a) => s + (a.relevance_score || 0), 0) / total).toFixed(1)
    : "0";

  const redArticles = articles.filter((a) => a.urgency === "red");
  const yellowArticles = articles.filter((a) => a.urgency === "yellow");
  const greenArticles = articles.filter((a) => a.urgency !== "red" && a.urgency !== "yellow");

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#18181b;font-size:13px;line-height:1.5;">
  <div style="max-width:700px;margin:0 auto;background:#ffffff;">

    <div style="padding:16px 24px;border-bottom:2px solid #18181b;">
      <table style="width:100%;" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:15px;font-weight:700;letter-spacing:0.5px;color:#18181b;">ACRYL INTELLIGENCE BRIEF</td>
        <td style="text-align:right;font-size:12px;color:#71717a;">${date}</td>
      </tr></table>
    </div>

    <div style="padding:8px 24px;background:#fafafa;border-bottom:1px solid #e4e4e7;font-size:11px;color:#52525b;">
      ${total}건 수집 &middot;
      <span style="color:#dc2626;">긴급 ${redCount}</span> &middot;
      <span style="color:#d97706;">주의 ${yellowCount}</span> &middot;
      <span style="color:#059669;">참고 ${greenCount}</span> &middot;
      관련도 ${avgScore}/10 &middot;
      심층분석 ${deepCount}건
    </div>

    ${renderBrief(executiveBrief || "")}

    ${renderUrgencyGroup("긴급", "#dc2626", redArticles)}
    ${renderUrgencyGroup("주의", "#d97706", yellowArticles)}
    ${renderUrgencyGroup("참고", "#71717a", greenArticles)}

    ${renderTrends(trends || [])}

    <div style="padding:10px 24px;border-top:1px solid #e4e4e7;text-align:center;">
      <span style="font-size:10px;color:#a1a1aa;">ACRYL Intelligence Brief &middot; Powered by Claude AI &middot; 본 브리프는 AI 자동 분석 결과이며 투자 조언이 아닙니다</span>
    </div>

  </div>
</body>
</html>`;
}
