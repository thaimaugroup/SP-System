const { createClient } = require("@supabase/supabase-js");
const fs = require("node:fs");

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const env = { ...readEnvFile(".env.local"), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const email = env.QA_ADMIN_EMAIL;
const password = env.QA_ADMIN_PASSWORD;

if (!url || !anonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
}

if (!email || !password) {
  throw new Error("QA_ADMIN_EMAIL and QA_ADMIN_PASSWORD are required. Use an owner/admin test account.");
}

const supabase = createClient(url, anonKey);
const serviceSupabase = serviceRoleKey ? createClient(url, serviceRoleKey) : null;
const qaRunId = `qa-${Date.now()}`;
const entityId = env.QA_ENTITY_ID;
if (!entityId) throw new Error("QA_ENTITY_ID is required. Set it in .env.local or as an environment variable.");

async function assertStep(name, fn) {
  try {
    const result = await fn();
    console.log(`PASS ${name}`);
    return result;
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    throw error;
  }
}

async function insert(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select("*").single();
  if (error) throw error;
  return data;
}

async function serviceInsert(table, row) {
  const client = serviceSupabase ?? supabase;
  const { data, error } = await client.from(table).insert(row).select("*").single();
  if (error) throw error;
  return data;
}

(async () => {
  const login = await supabase.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;

  const user = login.data.user;
  const { data: roleRow, error: roleError } = await supabase
    .from("user_entity_roles")
    .select("role, entity_id")
    .eq("entity_id", entityId)
    .maybeSingle();
  if (roleError) throw roleError;
  if (!roleRow || !["owner", "admin"].includes(roleRow.role)) {
    throw new Error("QA user must be owner/admin for the target entity.");
  }

  const ws01 = await assertStep("create WS01 product record", () =>
    insert("ws01_products", {
      entity_id: entityId,
      title: `${qaRunId} product`,
      description: "QA persistence product record",
      data: { qa_run_id: qaRunId, category: "QA" },
      source_type: "manual",
      status: "draft",
      created_by: user.id
    })
  );

  const storageKey = `${entityId}/QA/${qaRunId}.csv`;
  await assertStep("upload CSV to Supabase Storage imports bucket", async () => {
    const client = serviceSupabase ?? supabase;
    const { error } = await client.storage
      .from("imports")
      .upload(storageKey, new Blob(["title,amount\nQA Revenue,123\n"], { type: "text/csv" }), {
        contentType: "text/csv",
        upsert: false
      });
    if (error) throw error;
  });

  const batch = await assertStep("create import batch", () =>
    insert("import_batches", {
      entity_id: entityId,
      workspace_code: "WS04",
      target_table: "ws04_pl_records",
      status: "validated",
      row_count: 1,
      valid_row_count: 1,
      error_row_count: 0,
      created_by: user.id
    })
  );

  const importFile = await assertStep("create import file metadata", () =>
    insert("import_files", {
      entity_id: entityId,
      import_batch_id: batch.id,
      original_filename: `${qaRunId}.csv`,
      storage_bucket: "imports",
      storage_key: storageKey,
      mime_type: "text/csv",
      file_size_bytes: 28,
      detected_columns: ["title", "amount"],
      created_by: user.id
    })
  );

  const importRow = await assertStep("stage import row", () =>
    insert("import_rows", {
      entity_id: entityId,
      import_batch_id: batch.id,
      import_file_id: importFile.id,
      row_number: 2,
      raw_data: { title: "QA Revenue", amount: 123 },
      mapped_data: { title: "QA Revenue", description: "QA import row" },
      normalized_data: { amount: 123, qa_run_id: qaRunId },
      row_hash: qaRunId,
      validation_status: "valid",
      target_table: "ws04_pl_records",
      created_by: user.id
    })
  );

  const targetRecord = await assertStep("commit valid row into WS04 table", () =>
    insert("ws04_pl_records", {
      entity_id: entityId,
      title: `${qaRunId} P&L`,
      description: "QA committed import record",
      data: { amount: 123, qa_run_id: qaRunId },
      source_type: "import",
      import_batch_id: batch.id,
      status: "ready_for_review",
      created_by: user.id
    })
  );

  await assertStep("link import row to workspace record", () =>
    insert("workspace_data_links", {
      entity_id: entityId,
      source_table: "import_rows",
      source_record_id: importRow.id,
      source_record_version: 1,
      target_workspace_code: "WS04",
      target_table: "ws04_pl_records",
      target_record_id: targetRecord.id,
      target_record_version: 1,
      link_type: "import_to_workspace_record",
      link_strength: 1,
      metadata: { qa_run_id: qaRunId },
      created_by: user.id
    })
  );

  await assertStep("create data lineage edge", () =>
    insert("data_lineage_edges", {
      entity_id: entityId,
      source_type: "import_row",
      source_table: "import_rows",
      source_id: importRow.id,
      source_version: 1,
      target_type: "workspace_record",
      target_table: "ws04_pl_records",
      target_id: targetRecord.id,
      target_version: 1,
      edge_type: "import_commit",
      metadata: { qa_run_id: qaRunId },
      created_by: user.id
    })
  );

  await assertStep("create approval request", () =>
    insert("approval_requests", {
      entity_id: entityId,
      workspace_code: "WS04",
      record_table: "ws04_pl_records",
      record_id: targetRecord.id,
      record_version: 1,
      request_type: "import_review",
      status: "pending",
      requested_by: user.id,
      created_by: user.id
    })
  );

  await assertStep("create version history snapshot", () =>
    insert("version_history", {
      entity_id: entityId,
      record_table: "ws04_pl_records",
      record_id: targetRecord.id,
      version: 1,
      snapshot: targetRecord,
      change_summary: "QA persistence verification.",
      created_by: user.id
    })
  );

  await assertStep("write audit log", () =>
    serviceInsert("audit_logs", {
      entity_id: entityId,
      actor_user_id: user.id,
      event_type: "qa.persistence_verified",
      resource_type: "qa_run",
      resource_id: targetRecord.id,
      after_state: { qa_run_id: qaRunId, ws01_record_id: ws01.id, ws04_record_id: targetRecord.id },
      metadata: { storage_key: storageKey }
    })
  );

  console.log(JSON.stringify({ qaRunId, entityId, ws01RecordId: ws01.id, ws04RecordId: targetRecord.id, storageKey }, null, 2));
})();
