import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import { DEFAULT_SOURCES, DEFAULT_KEYWORD_GROUPS } from "@/lib/default-presets";
import type { Source, KeywordGroup } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    sources: DEFAULT_SOURCES,
    keyword_groups: DEFAULT_KEYWORD_GROUPS,
  });
}

export async function POST() {
  const results = {
    sources: { added: 0, skipped: 0, errors: [] as string[] },
    keywords: { added: 0, skipped: 0, errors: [] as string[] },
  };

  if (isSupabaseConfigured()) {
    // --- Sources ---
    try {
      const { data: existing } = await supabase.from("sources").select("name");
      const existingNames = new Set((existing || []).map((s: { name: string }) => s.name));

      const newSources = DEFAULT_SOURCES.filter((s) => !existingNames.has(s.name));
      if (newSources.length > 0) {
        const { error } = await supabase.from("sources").insert(newSources);
        if (error) {
          results.sources.errors.push(error.message);
        } else {
          results.sources.added = newSources.length;
        }
      }
      results.sources.skipped = DEFAULT_SOURCES.length - newSources.length;
    } catch (err) {
      results.sources.errors.push(err instanceof Error ? err.message : String(err));
    }

    // --- Keyword Groups ---
    try {
      const { data: existing } = await supabase.from("keyword_groups").select("group_name");
      const existingNames = new Set((existing || []).map((g: { group_name: string }) => g.group_name));

      const newGroups = DEFAULT_KEYWORD_GROUPS.filter((g) => !existingNames.has(g.group_name));
      if (newGroups.length > 0) {
        const { error } = await supabase.from("keyword_groups").insert(newGroups);
        if (error) {
          results.keywords.errors.push(error.message);
        } else {
          results.keywords.added = newGroups.length;
        }
      }
      results.keywords.skipped = DEFAULT_KEYWORD_GROUPS.length - newGroups.length;
    } catch (err) {
      results.keywords.errors.push(err instanceof Error ? err.message : String(err));
    }
  } else {
    // Local store fallback
    const existingSources = localStore.select<Source>("sources");
    const existingSourceNames = new Set(existingSources.map((s) => s.name));
    for (const s of DEFAULT_SOURCES) {
      if (!existingSourceNames.has(s.name)) {
        localStore.insert<Source>("sources", s as Omit<Source, "id" | "created_at">);
        results.sources.added++;
      } else {
        results.sources.skipped++;
      }
    }

    const existingGroups = localStore.select<KeywordGroup>("keyword_groups");
    const existingGroupNames = new Set(existingGroups.map((g) => g.group_name));
    for (const g of DEFAULT_KEYWORD_GROUPS) {
      if (!existingGroupNames.has(g.group_name)) {
        localStore.insert<KeywordGroup>("keyword_groups", g as Omit<KeywordGroup, "id" | "created_at">);
        results.keywords.added++;
      } else {
        results.keywords.skipped++;
      }
    }
  }

  return NextResponse.json({
    success: results.sources.errors.length === 0 && results.keywords.errors.length === 0,
    sources: results.sources,
    keywords: results.keywords,
    totalPresets: {
      sources: DEFAULT_SOURCES.length,
      keywords: DEFAULT_KEYWORD_GROUPS.length,
    },
  });
}
