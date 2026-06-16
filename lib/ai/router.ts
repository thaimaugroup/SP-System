import type { BusinessRecord } from "@/types/database";

export function buildStrategicSynthesis(records: BusinessRecord[]) {
  const approved = records.filter((record) => record.status === "approved");
  const topTitles = approved.slice(0, 6).map((record) => record.title).filter(Boolean);

  return {
    summary:
      topTitles.length > 0
        ? `Generated synthesis from ${topTitles.join(", ")}.`
        : "Generated synthesis has limited confidence because approved upstream records are missing.",
    confidence_score: topTitles.length >= 3 ? 78 : 42,
    citations: approved.slice(0, 8).map((record) => ({
      table: "workspace_record",
      id: record.id,
      title: record.title,
      version: record.version
    }))
  };
}

