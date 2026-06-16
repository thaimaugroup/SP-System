import * as XLSX from "xlsx";

export type ParsedImport = {
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
};

export async function parseImportFile(file: File): Promise<ParsedImport> {
  const buffer = await file.arrayBuffer();

  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number | boolean | null>>(sheet, {
      defval: null
    });
    return {
      columns: Object.keys(rows[0] ?? {}),
      rows
    };
  }

  const text = new TextDecoder().decode(buffer);
  return parseCsv(text);
}

function parseCsv(text: string): ParsedImport {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const columns = splitCsvLine(lines[0] ?? "").map((value) => value.trim());
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null]));
  });

  return { columns, rows };
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

