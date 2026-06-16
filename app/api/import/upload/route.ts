import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { parseImportFile } from "@/lib/import/parser";
import { hashRow, normalizeImportRow, validateNormalizedRow } from "@/lib/import/normalize";
import { importUploadSchema } from "@/lib/validation/import";
import { requireEntityContext, safeAudit, updateWorkspaceStatus } from "@/lib/db/server-helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const parsedPayload = importUploadSchema.safeParse({
    entityId: form.get("entityId"),
    workspaceCode: form.get("workspaceCode"),
    targetTable: form.get("targetTable")
  });

  if (!parsedPayload.success) {
    return NextResponse.json({ error: parsedPayload.error.issues[0]?.message ?? "Invalid import payload." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A CSV or XLSX file is required." }, { status: 400 });
  }

  const contextResult = await requireEntityContext(parsedPayload.data.entityId);
  if ("error" in contextResult) {
    return NextResponse.json({ error: contextResult.error }, { status: contextResult.status });
  }

  const { supabase, context } = contextResult;
  const { entityId, workspaceCode, targetTable } = parsedPayload.data;
  const parsed = await parseImportFile(file);
  const storageKey = `${entityId}/${workspaceCode}/${Date.now()}-${randomUUID()}-${sanitizeFilename(file.name)}`;

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      entity_id: entityId,
      strategic_cycle_id: context.cycle?.id ?? null,
      workspace_code: workspaceCode,
      target_table: targetTable,
      status: "uploaded",
      row_count: parsed.rows.length,
      created_by: context.profileId
    })
    .select("*")
    .single();

  if (batchError) {
    return NextResponse.json({ error: batchError.message }, { status: 500 });
  }

  const storageClient = createSupabaseAdminClient() ?? supabase;
  const { error: uploadError } = await storageClient.storage.from("imports").upload(storageKey, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadError) {
    await supabase.from("import_batches").update({ status: "failed" }).eq("id", batch.id);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: importFile, error: fileError } = await supabase
    .from("import_files")
    .insert({
      entity_id: entityId,
      import_batch_id: batch.id,
      original_filename: file.name,
      storage_bucket: "imports",
      storage_key: storageKey,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      detected_columns: parsed.columns,
      created_by: context.profileId
    })
    .select("*")
    .single();

  if (fileError) {
    return NextResponse.json({ error: fileError.message }, { status: 500 });
  }

  const sourceColumnMap = Object.fromEntries(parsed.columns.map((column) => [column, normalizeColumn(column)]));
  await supabase.from("import_mappings").insert({
    entity_id: entityId,
    workspace_code: workspaceCode,
    target_table: targetTable,
    name: `${file.name} auto mapping`,
    source_column_map: sourceColumnMap,
    transform_rules: { mode: "auto_normalize_to_generic_workspace_record" },
    is_default: false,
    status: "active",
    created_by: context.profileId
  });

  const importRows = parsed.rows.map((row, index) => {
    const mapped = normalizeImportRow(row, targetTable);
    const errors = validateNormalizedRow(mapped);
    return {
      entity_id: entityId,
      import_batch_id: batch.id,
      import_file_id: importFile.id,
      row_number: index + 2,
      raw_data: row,
      mapped_data: { title: mapped.title, description: mapped.description },
      normalized_data: mapped.data,
      row_hash: hashRow(row),
      validation_status: errors.length > 0 ? "error" : "valid",
      target_table: targetTable,
      created_by: context.profileId,
      errors
    };
  });

  const { data: stagedRows, error: rowsError } = await supabase
    .from("import_rows")
    .insert(importRows.map(({ errors, ...row }) => row))
    .select("id,row_number,validation_status");

  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 });
  }

  const rowIdByNumber = new Map((stagedRows ?? []).map((row: any) => [row.row_number, row.id]));
  const importErrors = importRows.flatMap((row) =>
    row.errors.map((error) => ({
      entity_id: entityId,
      import_batch_id: batch.id,
      import_row_id: rowIdByNumber.get(row.row_number) ?? null,
      severity: "error",
      field_name: error.field,
      error_code: error.code,
      message: error.message,
      raw_value: error.rawValue,
      created_by: context.profileId
    }))
  );

  if (importErrors.length > 0) {
    await supabase.from("import_errors").insert(importErrors);
  }

  const errorCount = importRows.filter((row) => row.errors.length > 0).length;
  const validCount = importRows.length - errorCount;
  await supabase
    .from("import_batches")
    .update({
      status: errorCount > 0 ? "validated_with_errors" : "validated",
      valid_row_count: validCount,
      error_row_count: errorCount
    })
    .eq("id", batch.id);

  await updateWorkspaceStatus({
    client: supabase,
    entityId,
    cycleId: context.cycle?.id ?? null,
    workspaceCode,
    dataReadinessScore: validCount > 0 ? 55 : 25,
    status: "in_progress"
  });

  await safeAudit({
    entityId,
    profileId: context.profileId,
    eventType: "import.uploaded",
    resourceType: "import_batches",
    resourceId: batch.id,
    afterState: { row_count: importRows.length, valid_row_count: validCount, error_row_count: errorCount },
    metadata: { workspace_code: workspaceCode, target_table: targetTable, storage_key: storageKey }
  });

  return NextResponse.json({
    batchId: batch.id,
    rowCount: importRows.length,
    validRowCount: validCount,
    errorRowCount: errorCount
  });
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function normalizeColumn(column: string) {
  return column
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

