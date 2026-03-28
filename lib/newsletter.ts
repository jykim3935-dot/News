import type { Article, ContentType, Trend } from "./supabase";

const SECTION_CONFIG: Record<
  ContentType,
  { emoji: string; label: string; order: number }
> = {
  news: { emoji: "📰", label: "뉴스 하이라이트", order: 1 },
  report: { emoji: "📊", label: "리서치 & 보고서", order: 2 },
  research: { emoji: "🎓", label: "학술 & 리서치", order: 3 },
  consulting: { emoji: "💼", label: "컨설팅 인사이트", order: 4 },
  government: { emoji: "🏛️", label: "정부정책 & 규제", order: 5 },
  global: { emoji: "🌍", label: "글로벌 동향", order: 6 },
  investment: { emoji: "💰", label: "투자/IR 시그널", order: 7 },
  blog: { emoji: "🔬", label: "기술 블로그", order: 8 },
};

function urgencyColor(urgency: string | null): string {
  switch (urgency) {
    case "red":
      return "#EF4444";
    case "yellow":
      return "#F59E0B";
    case "green":
      return "#10B981";
    default:
      return "#64748B";
  }
}

function urgencyLabel(urgency: string | null): string {
  switch (urgency) {
    case "red":
      return "🔴 긴급";
    case "yellow":
      return "🟡 주의";
    case "green":
      return "🟢 참고";
    default:
      return "⚪ -";
  }
}

function categoryLabel(category: string | null): string {
  const map: Record<string, string> = {
    competitive: "경쟁",
    market: "시장",
    regulation: "규제",
    tech: "기술",
    customer: "고객",
    investment: "투자",
  };
  return category ? map[category] || category : "-";
}

function relevanceBar(score: number | null): string {
  if (!score) return "-";
  const filled = score;
  const empty = 10 - score;
  return `${"█".repeat(filled)}${"░".repeat(empty)} ${score}/10`;
}

function strengthBadge(strength: string): string {
  switch (strength) {
    case "rising":
      return '<span style="background:#DC2626;color:#FEE2E2;padding:2px 8px;border-radius:10px;font-size:11px;">🔥 급부상</span>';
    case "emerging":
      return '<span style="background:#059669;color:#D1FAE5;padding:2px 8px;border-radius:10px;font-size:11px;">🌱 신흥</span>';
    case "stable":
      return '<span style="background:#2563EB;color:#DBEAFE;padding:2px 8px;border-radius:10px;font-size:11px;">📊 지속</span>';
    default:
      return "";
  }
}

function renderArticleRow(article: Article, index: number): string {
  const hasDeepAnalysis = article.deep_summary || (article.key_findings && article.key_findings.length > 0);

  let deepContent = "";
  if (hasDeepAnalysis) {
    const findings =
      article.key_findings && article.key_findings.length > 0
        ? `<div style="margin-top:6px;padding-left:12px;border-left:2px solid #3B82F6;">
            ${article.key_findings.map((f) => `<div style="color:#93C5FD;font-size:11px;margin:2px 0;">▸ ${f}</div>`).join("")}
          </div>`
        : "";

    const actions =
      article.action_items && article.action_items.length > 0
        ? `<div style="margin-top:4px;">
            ${article.action_items.map((a) => `<span style="background:#1E3A5F;color:#60A5FA;padding:1px 6px;border-radius:3px;font-size:10px;margin-right:4px;">▶ ${a}</span>`).join("")}
          </div>`
        : "";

    deepContent = `<tr style="background:#0F1729;">
      <td colspan="6" style="padding:4px 12px 12px 48px;">
        ${article.deep_summary ? `<div style="color:#CBD5E1;font-size:12px;line-height:1.5;margin-bottom:4px;">${article.deep_summary}</div>` : ""}
        ${findings}
        ${actions}
      </td>
    </tr>`;
  }

  const sourceDesc = article.source_description
    ? `<div style="color:#64748B;font-size:10px;margin-top:1px;font-style:italic;">${article.source_description}</div>`
    : "";

  return `<tr style="border-bottom:${hasDeepAnalysis ? "none" : "1px solid #334155"};">
    <td style="padding:8px 12px;color:#94A3B8;font-size:12px;">${index + 1}</td>
    <td style="padding:8px 12px;white-space:nowrap;">
      <span style="color:${urgencyColor(article.urgency)};font-size:12px;">${urgencyLabel(article.urgency)}</span>
    </td>
    <td style="padding:8px 12px;font-family:monospace;font-size:11px;color:#60A5FA;">${relevanceBar(article.relevance_score)}</td>
    <td style="padding:8px 12px;font-size:12px;">
      <span style="background:#1E293B;border:1px solid #475569;border-radius:4px;padding:2px 6px;color:#CBD5E1;">${categoryLabel(article.category)}</span>
    </td>
    <td style="padding:8px 12px;">
      <a href="${article.url}" style="color:#60A5FA;text-decoration:none;font-size:13px;">${article.title}</a>
      <div style="color:#94A3B8;font-size:11px;margin-top:2px;">${article.source || ""}</div>
      ${sourceDesc}
    </td>
    <td style="padding:8px 12px;color:#94A3B8;font-size:12px;max-width:300px;">${article.impact_comment || ""}</td>
  </tr>${deepContent}`;
}

function renderSection(
  contentType: ContentType,
  articles: Article[]
): string {
  if (articles.length === 0) return "";

  const config = SECTION_CONFIG[contentType];
  const sorted = [...articles].sort(
    (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)
  );

  return `
  <tr><td style="padding:24px 0 8px 0;">
    <h2 style="color:#E2E8F0;font-size:18px;font-weight:600;margin:0;">
      ${config.emoji} ${config.label}
      <span style="color:#64748B;font-size:14px;font-weight:400;margin-left:8px;">(${articles.length}건)</span>
    </h2>
  </td></tr>
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #334155;border-radius:8px;border-collapse:collapse;background:#1E293B;">
      <thead>
        <tr style="background:#0F172A;border-bottom:2px solid #334155;">
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;">#</th>
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;">긴급도</th>
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;">관련도</th>
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;">카테고리</th>
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;">제목 / 출처</th>
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;">ACRYL 임팩트</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map((a, i) => renderArticleRow(a, i)).join("")}
      </tbody>
    </table>
  </td></tr>`;
}

function renderExecutiveBrief(brief: string): string {
  if (!brief) return "";

  return `
  <tr><td style="padding:16px 0 8px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1E3A8A,#1E40AF);border:1px solid #3B82F6;border-radius:8px;">
      <tr>
        <td style="padding:20px 24px;">
          <h2 style="color:#F8FAFC;font-size:18px;font-weight:700;margin:0 0 12px 0;">
            🎯 오늘의 핵심 브리프
          </h2>
          <div style="color:#E2E8F0;font-size:14px;line-height:1.8;white-space:pre-line;">${brief}</div>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

function renderTrendsSection(trends: Trend[]): string {
  if (!trends || trends.length === 0) return "";

  const trendCards = trends
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 16px;border-bottom:1px solid #334155;">
          <div style="display:flex;align-items:center;gap:8px;">
            ${strengthBadge(t.strength)}
            <span style="color:#F8FAFC;font-size:14px;font-weight:600;">${t.trend_title}</span>
            <span style="color:#64748B;font-size:11px;margin-left:auto;">${t.related_article_ids?.length || 0}건 관련</span>
          </div>
          <div style="color:#94A3B8;font-size:12px;line-height:1.5;margin-top:6px;">${t.trend_description}</div>
        </td>
      </tr>`
    )
    .join("");

  return `
  <tr><td style="padding:16px 0 8px 0;">
    <h2 style="color:#E2E8F0;font-size:18px;font-weight:600;margin:0;">
      📈 트렌드 인사이트
      <span style="color:#64748B;font-size:14px;font-weight:400;margin-left:8px;">(${trends.length}개)</span>
    </h2>
  </td></tr>
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #334155;border-radius:8px;border-collapse:collapse;background:#1E293B;">
      ${trendCards}
    </table>
  </td></tr>`;
}

export interface NewsletterData {
  articles: Article[];
  date: string;
  executiveBrief?: string;
  trends?: Trend[];
}

export function renderNewsletter(data: NewsletterData): string {
  const { articles, date, executiveBrief, trends } = data;

  // Group by content type
  const grouped: Record<ContentType, Article[]> = {
    news: [],
    report: [],
    research: [],
    consulting: [],
    government: [],
    global: [],
    investment: [],
    blog: [],
  };

  for (const a of articles) {
    if (grouped[a.content_type]) {
      grouped[a.content_type].push(a);
    }
  }

  // Summary stats
  const total = articles.length;
  const redCount = articles.filter((a) => a.urgency === "red").length;
  const yellowCount = articles.filter((a) => a.urgency === "yellow").length;
  const greenCount = articles.filter((a) => a.urgency === "green").length;
  const deepCount = articles.filter((a) => a.deep_summary).length;
  const avgScore =
    articles.length > 0
      ? (
          articles.reduce(
            (sum, a) => sum + (a.relevance_score || 0),
            0
          ) / articles.length
        ).toFixed(1)
      : "0";

  const typeSummary = Object.entries(SECTION_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([ct, cfg]) => {
      const count = grouped[ct as ContentType]?.length || 0;
      return count > 0 ? `${cfg.emoji} ${cfg.label} ${count}건` : null;
    })
    .filter(Boolean)
    .join("  ·  ");

  const sections = Object.entries(SECTION_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([ct]) =>
      renderSection(ct as ContentType, grouped[ct as ContentType])
    )
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0F172A;color:#E2E8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:960px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <tr><td style="padding:24px 0;border-bottom:2px solid #334155;">
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#F8FAFC;">
        🏢 ACRYL Intelligence Brief
      </h1>
      <p style="margin:4px 0 0;color:#64748B;font-size:14px;">${date} · AI 기반 경영정보 브리프 v2.0</p>
    </td></tr>

    <!-- Summary Bar -->
    <tr><td style="padding:16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1E293B;border:1px solid #334155;border-radius:8px;">
        <tr>
          <td style="padding:12px 16px;">
            <span style="color:#64748B;font-size:12px;">전체</span>
            <span style="color:#F8FAFC;font-size:18px;font-weight:700;margin-left:4px;">${total}건</span>
          </td>
          <td style="padding:12px 16px;">
            <span style="color:#EF4444;">🔴 ${redCount}</span>
            <span style="color:#F59E0B;margin-left:8px;">🟡 ${yellowCount}</span>
            <span style="color:#10B981;margin-left:8px;">🟢 ${greenCount}</span>
          </td>
          <td style="padding:12px 16px;">
            <span style="color:#64748B;font-size:12px;">평균 관련도</span>
            <span style="color:#60A5FA;font-size:16px;font-weight:600;margin-left:4px;">${avgScore}/10</span>
          </td>
          <td style="padding:12px 16px;">
            <span style="color:#64748B;font-size:12px;">심층분석</span>
            <span style="color:#A78BFA;font-size:16px;font-weight:600;margin-left:4px;">${deepCount}건</span>
          </td>
        </tr>
        <tr>
          <td colspan="4" style="padding:4px 16px 12px;color:#94A3B8;font-size:12px;">
            ${typeSummary}
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Executive Brief -->
    ${renderExecutiveBrief(executiveBrief || "")}

    <!-- Trends -->
    ${renderTrendsSection(trends || [])}

    <!-- Sections -->
    ${sections}

    <!-- Footer -->
    <tr><td style="padding:32px 0 16px;border-top:1px solid #334155;text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0;">
        Powered by Claude AI · ACRYL Intelligence Brief v2.0<br>
        5개 수집기 · 2단계 큐레이션 · 트렌드 탐지 · 경영진 브리프<br>
        본 브리프는 AI가 자동 수집·분석한 결과이며, 투자 조언이 아닙니다.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}
