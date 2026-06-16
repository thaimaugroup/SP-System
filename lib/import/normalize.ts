import { createHash } from "node:crypto";

export type ImportRawRow = Record<string, string | number | boolean | null>;

const titleCandidates = [
  "title",
  "name",
  "product",
  "product_name",
  "customer_segment",
  "segment",
  "objective",
  "priority",
  "kpi",
  "month",
  "period"
];

const descriptionCandidates = ["description", "summary", "notes", "detail", "details", "comment", "comments"];

export function normalizeImportRow(row: ImportRawRow, targetTable: string) {
  const normalizedKeys = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
  );

  const title =
    pickFirstValue(normalizedKeys, titleCandidates) ??
    inferTitleFromTable(targetTable, normalizedKeys) ??
    "Imported record";

  return {
    title: String(title),
    description: pickFirstValue(normalizedKeys, descriptionCandidates)?.toString() ?? null,
    data: {
      ...normalizedKeys,
      import_source_table: targetTable
    }
  };
}

export function validateNormalizedRow(row: ReturnType<typeof normalizeImportRow>) {
  const errors: { field: string; code: string; message: string; rawValue: unknown }[] = [];
  if (!row.title || row.title.trim().length < 2) {
    errors.push({
      field: "title",
      code: "required_title",
      message: "A title/name/objective/period value is required for the target workspace record.",
      rawValue: row.title
    });
  }
  return errors;
}

export function hashRow(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function pickFirstValue(row: Record<string, string | number | boolean | null>, candidates: string[]) {
  for (const candidate of candidates) {
    const value = row[candidate];
    if (value !== null && value !== undefined && String(value).trim().length > 0) return value;
  }
  return null;
}

function inferTitleFromTable(targetTable: string, row: Record<string, string | number | boolean | null>) {
  if (targetTable.includes("pl") || targetTable.includes("revenue") || targetTable.includes("cost")) {
    const period = pickFirstValue(row, ["period", "month", "date", "year"]);
    return period ? `${targetTable} ${period}` : null;
  }

  if (targetTable.includes("kpi")) {
    return pickFirstValue(row, ["metric", "measure", "indicator", "kpi"]);
  }

  return null;
}

