import type { Article, ContentType } from "./supabase";

const SECTION_CONFIG: Record<
  ContentType,
  { emoji: string; label: string; order: number }
> = {
  news: { emoji: "📰", label: "뉴스 하이라이트", order: 1 },
  report: { emoji: "📊", label: "리서치 & 보고서", order: 2 },
  consulting: { emoji: "📊", label: "컨설팅 인사이트", order: 3 },
  global: { emoji: "🌍", label: "글로벌 동향", order: 4 },
  investment: { emoji: "💰", label: "투자/IR 시그널", order: 5 },
  blog: { emoji: "🔬", label: "기술 블로그", order: 6 },
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

function renderArticleRow(article: Article, index: number): string {
  return `<tr style="border-bottom:1px solid #334155;">
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
    </td>
    <td style="padding:8px 12px;color:#94A3B8;font-size:12px;max-width:300px;">${article.impact_comment || ""}</td>
  </tr>`;
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

export function renderNewsletter(
  articles: Article[],
  date: string
): string {
  // Group by content type
  const grouped: Record<ContentType, Article[]> = {
    news: [],
    report: [],
    consulting: [],
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
  const yellowCount = articles.filter(
    (a) => a.urgency === "yellow"
  ).length;
  const greenCount = articles.filter(
    (a) => a.urgency === "green"
  ).length;
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
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:900px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <tr><td style="padding:24px 0;border-bottom:2px solid #334155;">
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#F8FAFC;">
        🏢 ACRYL Intelligence Brief
      </h1>
      <p style="margin:4px 0 0;color:#64748B;font-size:14px;">${date} · AI 기반 경영정보 브리프</p>
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
        </tr>
        <tr>
          <td colspan="3" style="padding:4px 16px 12px;color:#94A3B8;font-size:12px;">
            ${typeSummary}
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Sections -->
    ${sections}

    <!-- Footer -->
    <tr><td style="padding:32px 0 16px;border-top:1px solid #334155;text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0;">
        Powered by Claude AI · ACRYL BTS<br>
        본 브리프는 AI가 자동 수집·분석한 결과이며, 투자 조언이 아닙니다.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}
