import type { Article, Trend } from "./supabase";
import type { NewsletterData } from "./newsletter";
import {
  categoryLabel,
  contentTypeLabel,
  displayTitle,
  displaySummary,
} from "./newsletter";

/* ─── Brief → Markdown ─── */

function renderBriefMd(brief: string): string {
  if (!brief || brief.includes("브리프 생성") || brief.includes("수집된 기사가")) return "";

  const tags = ["긴급 대응", "시장 시그널", "기회 포착", "주간 맥락"];
  const regex = new RegExp(
    `\\[(${tags.join("|")})\\]\\s*(.+?)(?=\\[(?:${tags.join("|")})\\]|$)`,
    "gs",
  );

  const sections: string[] = [];
  let match;
  while ((match = regex.exec(brief)) !== null) {
    const tag = match[1];
    const content = match[2].trim();
    if (content) sections.push(`**[${tag}]** ${content}`);
  }

  if (sections.length === 0) sections.push(brief);

  return `## AI 핵심 요약\n\n${sections.join("\n\n")}\n`;
}

/* ─── Single Article ─── */

function renderArticleMd(a: Article): string {
  const title = displayTitle(a);
  const score = a.relevance_score || 0;
  const meta = [a.source, contentTypeLabel(a.content_type), categoryLabel(a.category)]
    .filter(Boolean)
    .join(" · ");
  const date = a.published_at || "";

  const lines: string[] = [];

  lines.push(`### [${score}/10] ${title}`);
  lines.push(`> ${meta}${date ? ` · ${date}` : ""}`);
  lines.push(`> [원문 보기](${a.url})`);
  lines.push("");

  const summary = displaySummary(a);
  if (summary) lines.push(summary, "");

  if (a.impact_comment) lines.push(`**ACRYL 임팩트:** ${a.impact_comment}`, "");

  if (a.deep_summary) lines.push(`> *${a.deep_summary}*`, "");

  if (a.key_findings?.length) {
    lines.push(`**핵심 발견:** ${a.key_findings.join(" / ")}`, "");
  }

  if (a.action_items?.length) {
    lines.push(`**액션:** ${a.action_items.join(" / ")}`, "");
  }

  return lines.join("\n");
}

/* ─── Urgency Group ─── */

function renderGroupMd(emoji: string, label: string, articles: Article[]): string {
  if (articles.length === 0) return "";
  const sorted = [...articles].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const header = `## ${emoji} ${label} (${articles.length})\n`;
  return header + "\n" + sorted.map(renderArticleMd).join("\n---\n\n") + "\n";
}

/* ─── Trends ─── */

function renderTrendsMd(trends: Trend[]): string {
  if (!trends || trends.length === 0) return "";

  const strengthLabels: Record<string, string> = {
    rising: "급부상",
    emerging: "신흥",
    stable: "지속",
  };

  const items = trends.map((t) => {
    const strength = strengthLabels[t.strength] || t.strength;
    const desc =
      t.trend_description.length > 150
        ? t.trend_description.slice(0, 150) + "..."
        : t.trend_description;
    const count = t.related_article_ids?.length || 0;
    return `- **${strength}** **${t.trend_title}** — ${desc} (${count}건)`;
  });

  return `## 트렌드 (${trends.length})\n\n${items.join("\n")}\n`;
}

/* ─── Main ─── */

export function renderNewsletterMarkdown(data: NewsletterData): string {
  const { articles, date, executiveBrief, trends } = data;

  const total = articles.length;
  const redCount = articles.filter((a) => a.urgency === "red").length;
  const yellowCount = articles.filter((a) => a.urgency === "yellow").length;
  const greenCount = total - redCount - yellowCount;
  const deepCount = articles.filter((a) => a.deep_summary).length;
  const avgScore =
    total > 0
      ? (articles.reduce((s, a) => s + (a.relevance_score || 0), 0) / total).toFixed(1)
      : "0";

  const redArticles = articles.filter((a) => a.urgency === "red");
  const yellowArticles = articles.filter((a) => a.urgency === "yellow");
  const greenArticles = articles.filter((a) => a.urgency !== "red" && a.urgency !== "yellow");

  const sections: string[] = [];

  // Header
  sections.push(`# ACRYL INTELLIGENCE BRIEF`);
  sections.push(`> ${date}\n`);

  // Stats
  sections.push(
    `**${total}건 수집** · 긴급 ${redCount} · 주의 ${yellowCount} · 참고 ${greenCount} · 관련도 ${avgScore}/10 · 심층분석 ${deepCount}건\n`,
  );

  sections.push("---\n");

  // Brief
  const briefMd = renderBriefMd(executiveBrief || "");
  if (briefMd) sections.push(briefMd, "---\n");

  // Urgency groups
  const redMd = renderGroupMd("🔴", "긴급", redArticles);
  const yellowMd = renderGroupMd("🟡", "주의", yellowArticles);
  const greenMd = renderGroupMd("🟢", "참고", greenArticles);
  if (redMd) sections.push(redMd);
  if (yellowMd) sections.push(yellowMd);
  if (greenMd) sections.push(greenMd);

  // Trends
  const trendsMd = renderTrendsMd(trends || []);
  if (trendsMd) sections.push("---\n", trendsMd);

  // Footer
  sections.push(
    "---\n",
    "*ACRYL Intelligence Brief · Powered by Claude AI · 본 브리프는 AI 자동 분석 결과이며 투자 조언이 아닙니다*\n",
  );

  return sections.join("\n");
}
