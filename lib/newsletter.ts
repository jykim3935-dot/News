import type { Article, Trend } from "./supabase";

/* ─── Color & Label Helpers ─── */

function urgencyColor(urgency: string | null): string {
  switch (urgency) {
    case "red": return "#DC2626";
    case "yellow": return "#D97706";
    case "green": return "#059669";
    default: return "#94A3B8";
  }
}

function urgencyBg(urgency: string | null): string {
  switch (urgency) {
    case "red": return "#FEF2F2";
    case "yellow": return "#FFFBEB";
    case "green": return "#F0FDF4";
    default: return "#F8FAFC";
  }
}

function urgencyLabel(urgency: string | null): string {
  switch (urgency) {
    case "red": return "긴급";
    case "yellow": return "주의";
    case "green": return "참고";
    default: return "-";
  }
}

function urgencyDot(urgency: string | null): string {
  switch (urgency) {
    case "red": return "🔴";
    case "yellow": return "🟡";
    case "green": return "🟢";
    default: return "⚪";
  }
}

function categoryLabel(category: string | null): string {
  const map: Record<string, string> = {
    competitive: "경쟁", market: "시장", regulation: "규제",
    tech: "기술", customer: "고객", investment: "투자",
  };
  return category ? map[category] || category : "";
}

function contentTypeLabel(ct: string | null): string {
  const map: Record<string, string> = {
    news: "뉴스", report: "보고서", research: "학술",
    consulting: "컨설팅", government: "정부정책",
    global: "글로벌", investment: "투자/IR", blog: "기술블로그",
  };
  return ct ? map[ct] || ct : "";
}

function strengthBadge(strength: string): string {
  switch (strength) {
    case "rising":
      return '<span style="background:#FEF2F2;color:#DC2626;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">🔥 급부상</span>';
    case "emerging":
      return '<span style="background:#F0FDF4;color:#059669;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">🌱 신흥</span>';
    case "stable":
      return '<span style="background:#EFF6FF;color:#2563EB;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">📊 지속</span>';
    default: return "";
  }
}

function getDisplayTitle(article: Article): string {
  return article.title_ko || article.title;
}

function getDisplaySummary(article: Article): string {
  return article.summary_ko || article.summary || "";
}

/* ─── Executive Brief Parser ─── */

interface BriefSection {
  tag: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  content: string;
}

function parseExecutiveBrief(brief: string): BriefSection[] {
  const sectionDefs = [
    { tag: "긴급 대응", label: "긴급 대응", color: "#DC2626", bgColor: "#FEF2F2", borderColor: "#FECACA", icon: "🚨" },
    { tag: "시장 시그널", label: "시장 시그널", color: "#D97706", bgColor: "#FFFBEB", borderColor: "#FDE68A", icon: "📡" },
    { tag: "기회 포착", label: "기회 포착", color: "#059669", bgColor: "#F0FDF4", borderColor: "#BBF7D0", icon: "🎯" },
    { tag: "주간 맥락", label: "주간 맥락", color: "#2563EB", bgColor: "#EFF6FF", borderColor: "#BFDBFE", icon: "📅" },
  ];

  const sections: BriefSection[] = [];

  for (const def of sectionDefs) {
    const regex = new RegExp(`\\[${def.tag}\\]\\s*(.+?)(?=\\[(?:긴급 대응|시장 시그널|기회 포착|주간 맥락)\\]|$)`, "s");
    const match = brief.match(regex);
    if (match && match[1].trim()) {
      sections.push({ ...def, content: match[1].trim() });
    }
  }

  // Fallback: if no sections parsed, treat entire brief as one block
  if (sections.length === 0 && brief.trim()) {
    sections.push({
      tag: "브리프", label: "핵심 브리프", color: "#1E40AF",
      bgColor: "#EFF6FF", borderColor: "#BFDBFE", icon: "📋",
      content: brief.trim(),
    });
  }

  return sections;
}

/* ─── Article Card ─── */

function renderArticleCard(article: Article): string {
  const displayTitle = getDisplayTitle(article);
  const displaySummary = getDisplaySummary(article);
  const score = article.relevance_score || 0;
  const scoreColor = score >= 8 ? "#DC2626" : score >= 6 ? "#D97706" : "#059669";

  let deepContent = "";
  if (article.deep_summary || (article.key_findings && article.key_findings.length > 0)) {
    const findings = article.key_findings?.length > 0
      ? article.key_findings.map((f) =>
        `<div style="display:flex;align-items:flex-start;gap:6px;margin:4px 0;">
          <span style="color:#2563EB;font-size:11px;flex-shrink:0;">▸</span>
          <span style="color:#1E40AF;font-size:12px;line-height:1.5;">${f}</span>
        </div>`
      ).join("") : "";

    const actions = article.action_items?.length > 0
      ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
          ${article.action_items.map((a) =>
            `<span style="background:#EFF6FF;color:#2563EB;padding:2px 8px;border-radius:4px;font-size:11px;border:1px solid #BFDBFE;">▶ ${a}</span>`
          ).join("")}
        </div>` : "";

    deepContent = `
      <div style="margin-top:10px;padding:12px;background:#F8FAFC;border-radius:6px;border:1px solid #E2E8F0;">
        ${article.deep_summary ? `<div style="color:#334155;font-size:12px;line-height:1.6;margin-bottom:6px;">${article.deep_summary}</div>` : ""}
        ${findings ? `<div style="margin-top:6px;padding-left:8px;border-left:3px solid #3B82F6;">${findings}</div>` : ""}
        ${actions}
      </div>`;
  }

  return `
  <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:10px;border-left:4px solid ${urgencyColor(article.urgency)};">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
      <div style="flex:1;">
        <a href="${article.url}" style="color:#0F172A;text-decoration:none;font-size:14px;font-weight:600;line-height:1.4;" target="_blank">${displayTitle}</a>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-left:12px;flex-shrink:0;">
        <span style="background:${urgencyBg(article.urgency)};color:${urgencyColor(article.urgency)};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${urgencyDot(article.urgency)} ${urgencyLabel(article.urgency)}</span>
        <span style="background:#F1F5F9;color:${scoreColor};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${score}/10</span>
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
      ${article.source ? `<span style="background:#F1F5F9;color:#475569;padding:1px 6px;border-radius:3px;font-size:11px;">${article.source}</span>` : ""}
      ${article.content_type ? `<span style="background:#F1F5F9;color:#475569;padding:1px 6px;border-radius:3px;font-size:11px;">${contentTypeLabel(article.content_type)}</span>` : ""}
      ${article.category ? `<span style="background:#F1F5F9;color:#475569;padding:1px 6px;border-radius:3px;font-size:11px;">${categoryLabel(article.category)}</span>` : ""}
      ${article.published_at ? `<span style="color:#94A3B8;font-size:11px;">${article.published_at}</span>` : ""}
    </div>
    ${displaySummary ? `<div style="color:#475569;font-size:12px;line-height:1.6;margin-bottom:6px;">${displaySummary}</div>` : ""}
    ${article.impact_comment ? `<div style="color:#0F172A;font-size:12px;line-height:1.5;padding:8px 10px;background:#FFFBEB;border-radius:4px;border-left:3px solid #F59E0B;"><strong>ACRYL 임팩트:</strong> ${article.impact_comment}</div>` : ""}
    ${deepContent}
  </div>`;
}

/* ─── Deep Analysis Spotlight ─── */

function renderDeepSpotlight(articles: Article[]): string {
  const deepArticles = articles
    .filter((a) => a.deep_summary)
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 3);

  if (deepArticles.length === 0) return "";

  const cards = deepArticles.map((a) => {
    const displayTitle = getDisplayTitle(a);
    const findings = a.key_findings?.length > 0
      ? a.key_findings.map((f) =>
        `<div style="display:flex;align-items:flex-start;gap:6px;margin:3px 0;">
          <span style="color:#7C3AED;font-size:11px;">◆</span>
          <span style="color:#1E293B;font-size:12px;line-height:1.5;">${f}</span>
        </div>`
      ).join("") : "";

    const actions = a.action_items?.length > 0
      ? `<div style="margin-top:8px;">
          ${a.action_items.map((act) =>
            `<div style="color:#059669;font-size:11px;margin:2px 0;">→ ${act}</div>`
          ).join("")}
        </div>` : "";

    return `
    <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="background:#F5F3FF;color:#7C3AED;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${a.relevance_score}/10</span>
        <a href="${a.url}" style="color:#0F172A;font-size:13px;font-weight:600;text-decoration:none;" target="_blank">${displayTitle}</a>
      </div>
      ${a.source_description ? `<div style="color:#64748B;font-size:11px;font-style:italic;margin-bottom:6px;">📌 ${a.source_description}</div>` : ""}
      <div style="color:#334155;font-size:12px;line-height:1.6;">${a.deep_summary}</div>
      ${findings ? `<div style="margin-top:8px;padding:8px;background:#F5F3FF;border-radius:6px;">${findings}</div>` : ""}
      ${actions}
    </div>`;
  }).join("");

  return `
  <div style="margin:24px 0;">
    <h2 style="color:#0F172A;font-size:16px;font-weight:700;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #7C3AED;">
      🔬 심층 분석 스포트라이트 <span style="color:#94A3B8;font-size:13px;font-weight:400;">(${deepArticles.length}건)</span>
    </h2>
    ${cards}
  </div>`;
}

/* ─── Tier Sections ─── */

function renderTierSection(
  title: string,
  subtitle: string,
  borderColor: string,
  articles: Article[]
): string {
  if (articles.length === 0) return "";

  const sorted = [...articles].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const cards = sorted.map((a) => renderArticleCard(a)).join("");

  return `
  <div style="margin:24px 0;">
    <h2 style="color:#0F172A;font-size:16px;font-weight:700;margin:0 0 4px 0;padding-bottom:8px;border-bottom:2px solid ${borderColor};">
      ${title} <span style="color:#94A3B8;font-size:13px;font-weight:400;">(${articles.length}건)</span>
    </h2>
    <p style="color:#64748B;font-size:12px;margin:0 0 12px 0;">${subtitle}</p>
    ${cards}
  </div>`;
}

/* ─── Trends Section ─── */

function renderTrendsSection(trends: Trend[]): string {
  if (!trends || trends.length === 0) return "";

  const trendCards = trends.map((t) => `
    <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;padding:14px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        ${strengthBadge(t.strength)}
        <span style="color:#0F172A;font-size:14px;font-weight:600;">${t.trend_title}</span>
        <span style="color:#94A3B8;font-size:11px;">${t.related_article_ids?.length || 0}건 관련</span>
      </div>
      <div style="color:#475569;font-size:12px;line-height:1.6;">${t.trend_description}</div>
    </div>
  `).join("");

  return `
  <div style="margin:24px 0;">
    <h2 style="color:#0F172A;font-size:16px;font-weight:700;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #F59E0B;">
      📈 트렌드 인사이트 <span style="color:#94A3B8;font-size:13px;font-weight:400;">(${trends.length}개)</span>
    </h2>
    ${trendCards}
  </div>`;
}

/* ─── Executive Brief ─── */

function renderExecutiveBrief(brief: string): string {
  if (!brief) return "";

  const sections = parseExecutiveBrief(brief);
  if (sections.length === 0) return "";

  const cards = sections.map((s) => `
    <div style="background:${s.bgColor};border:1px solid ${s.borderColor};border-radius:8px;padding:14px;margin-bottom:8px;">
      <div style="color:${s.color};font-size:12px;font-weight:700;margin-bottom:6px;">${s.icon} ${s.label}</div>
      <div style="color:#1E293B;font-size:13px;line-height:1.7;">${s.content}</div>
    </div>
  `).join("");

  return `
  <div style="margin:20px 0;">
    <h2 style="color:#FFFFFF;font-size:16px;font-weight:700;margin:0;padding:14px 20px;background:linear-gradient(135deg,#1E40AF,#3B82F6);border-radius:8px 8px 0 0;">
      🎯 오늘의 핵심 브리프
    </h2>
    <div style="padding:16px;background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;">
      ${cards}
    </div>
  </div>`;
}

/* ─── Main Render ─── */

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
  const greenCount = articles.filter((a) => a.urgency === "green").length;
  const deepCount = articles.filter((a) => a.deep_summary).length;
  const avgScore = articles.length > 0
    ? (articles.reduce((sum, a) => sum + (a.relevance_score || 0), 0) / articles.length).toFixed(1)
    : "0";

  // Tier A: urgent (red) + important (yellow with score >= 7)
  const tierA = articles.filter((a) =>
    a.urgency === "red" || (a.urgency === "yellow" && (a.relevance_score || 0) >= 7)
  );
  // Tier B: everything else
  const tierB = articles.filter((a) =>
    !(a.urgency === "red" || (a.urgency === "yellow" && (a.relevance_score || 0) >= 7))
  );

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #F1F5F9; }
    a { color: #2563EB; }
    @media (max-width: 600px) {
      .dashboard-grid { display: block !important; }
      .dashboard-cell { display: block !important; padding: 8px 16px !important; border-bottom: 1px solid #1E293B !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:0;">

    <!-- Dark Navy Masthead -->
    <div style="background:#0F172A;padding:28px 24px 20px;border-radius:0 0 0 0;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">
        ACRYL Intelligence Brief
      </h1>
      <p style="margin:6px 0 0;color:#94A3B8;font-size:13px;">${date} · AI 기반 경영정보 브리프</p>
    </div>

    <!-- Situation Dashboard -->
    <div style="background:#1E293B;padding:0;border-bottom:3px solid #3B82F6;">
      <table width="100%" cellpadding="0" cellspacing="0" class="dashboard-grid" style="border-collapse:collapse;">
        <tr>
          <td class="dashboard-cell" style="padding:12px 20px;text-align:center;border-right:1px solid #334155;">
            <div style="color:#94A3B8;font-size:10px;text-transform:uppercase;letter-spacing:1px;">전체</div>
            <div style="color:#FFFFFF;font-size:22px;font-weight:700;margin-top:2px;">${total}<span style="color:#64748B;font-size:12px;font-weight:400;">건</span></div>
          </td>
          <td class="dashboard-cell" style="padding:12px 20px;text-align:center;border-right:1px solid #334155;">
            <div style="color:#94A3B8;font-size:10px;text-transform:uppercase;letter-spacing:1px;">긴급도</div>
            <div style="margin-top:4px;">
              <span style="color:#EF4444;font-size:14px;font-weight:700;">🔴${redCount}</span>
              <span style="color:#F59E0B;font-size:14px;font-weight:700;margin-left:8px;">🟡${yellowCount}</span>
              <span style="color:#10B981;font-size:14px;font-weight:700;margin-left:8px;">🟢${greenCount}</span>
            </div>
          </td>
          <td class="dashboard-cell" style="padding:12px 20px;text-align:center;border-right:1px solid #334155;">
            <div style="color:#94A3B8;font-size:10px;text-transform:uppercase;letter-spacing:1px;">관련도</div>
            <div style="color:#60A5FA;font-size:22px;font-weight:700;margin-top:2px;">${avgScore}<span style="color:#64748B;font-size:12px;font-weight:400;">/10</span></div>
          </td>
          <td class="dashboard-cell" style="padding:12px 20px;text-align:center;">
            <div style="color:#94A3B8;font-size:10px;text-transform:uppercase;letter-spacing:1px;">심층분석</div>
            <div style="color:#A78BFA;font-size:22px;font-weight:700;margin-top:2px;">${deepCount}<span style="color:#64748B;font-size:12px;font-weight:400;">건</span></div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Content Area -->
    <div style="background:#F1F5F9;padding:20px 24px;">

      ${renderExecutiveBrief(executiveBrief || "")}

      ${renderTierSection(
        "🚨 즉시 검토 필요",
        "긴급 대응 또는 높은 관련도(7+)로 분류된 기사",
        "#DC2626",
        tierA
      )}

      ${renderDeepSpotlight(articles)}

      ${renderTrendsSection(trends || [])}

      ${renderTierSection(
        "📋 모니터링",
        "참고 수준의 기사 및 업계 동향",
        "#94A3B8",
        tierB
      )}

    </div>

    <!-- Footer -->
    <div style="background:#0F172A;padding:20px 24px;text-align:center;">
      <p style="color:#64748B;font-size:11px;margin:0;line-height:1.6;">
        Powered by Claude AI · ACRYL Intelligence Brief<br>
        본 브리프는 AI가 자동 수집·분석한 결과이며, 투자 조언이 아닙니다.
      </p>
    </div>

  </div>
</body>
</html>`;
}
