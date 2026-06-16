// Realtime E2E QA for SIOS.
// Proves the "fill data -> persist -> realtime live update" pipeline end to end:
//   1. Sign in as an entity admin/owner test account (so RLS + realtime auth apply).
//   2. Subscribe to a workspace table filtered by entity_id.
//   3. INSERT a record and assert the realtime INSERT event is received.
//   4. UPDATE the record and assert the realtime UPDATE event is received.
//   5. Clean up the QA record.
//
// Run: npm run qa:realtime
// Requires env (via .env.local or process.env):
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//   QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD, (optional) QA_ENTITY_ID, SUPABASE_SERVICE_ROLE_KEY

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
const email = env.QA_ADMIN_EMAIL;
const password = env.QA_ADMIN_PASSWORD;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const entityId = env.QA_ENTITY_ID;
const cycleId = env.QA_CYCLE_ID;

if (!entityId) throw new Error("QA_ENTITY_ID is required. Set it in .env.local or as an environment variable.");
if (!cycleId) throw new Error("QA_CYCLE_ID is required. Set it in .env.local or as an environment variable.");
const TABLE = env.QA_REALTIME_TABLE ?? "ws01_products";
const TIMEOUT_MS = Number(env.QA_REALTIME_TIMEOUT_MS ?? 12000);

if (!url || !anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
if (!email || !password) throw new Error("QA_ADMIN_EMAIL and QA_ADMIN_PASSWORD are required (owner/admin test account).");

const supabase = createClient(url, anonKey, { realtime: { params: { eventsPerSecond: 10 } } });
const cleanup = serviceRoleKey ? createClient(url, serviceRoleKey) : supabase;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function waitFor(label, predicate) {
  const d = deferred();
  let timer = null;
  let settled = false;
  return {
    // Start the timeout only when the phase that should emit the event begins.
    arm: () => {
      if (timer || settled) return;
      timer = setTimeout(() => {
        if (!settled) d.reject(new Error(`timeout waiting for ${label} after ${TIMEOUT_MS}ms`));
      }, TIMEOUT_MS);
    },
    settle: (payload) => {
      if (settled) return;
      if (predicate(payload)) {
        settled = true;
        if (timer) clearTimeout(timer);
        d.resolve(payload);
      }
    },
    promise: d.promise
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let failures = 0;
  const log = (ok, name, extra = "") => {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  };

  // 1. Authenticate (RLS + realtime authorization use this session).
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    log(false, "auth.signIn", authError.message);
    process.exit(1);
  }
  log(true, "auth.signIn", email);
  await supabase.realtime.setAuth(auth.session.access_token);

  const tag = `realtime-qa-${Date.now()}`;
  const insertWaiter = waitFor("INSERT event", (p) => p.eventType === "INSERT" && p.new?.title === tag);
  const updateWaiter = waitFor("UPDATE event", (p) => p.eventType === "UPDATE" && p.new?.status === "ready_for_review");

  // 2. Subscribe.
  const subscribed = deferred();
  const channel = supabase
    .channel(`qa:${TABLE}:${entityId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `entity_id=eq.${entityId}` }, (payload) => {
      insertWaiter.settle(payload);
      updateWaiter.settle(payload);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") subscribed.resolve(true);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") subscribed.reject(new Error(`channel ${status}`));
    });

  try {
    await subscribed.promise;
    log(true, "realtime.subscribe", `${TABLE} entity=${entityId}`);
  } catch (e) {
    log(false, "realtime.subscribe", e.message);
    await supabase.removeChannel(channel);
    process.exit(1);
  }

  // Warmup: postgres_changes can drop events fired in the moment right after
  // SUBSCRIBED while logical replication catches up (cold connections need longer).
  // Mirror real UX (user types after the page is open) with a settle delay before
  // the first write. Tunable via QA_REALTIME_WARMUP_MS.
  await sleep(Number(env.QA_REALTIME_WARMUP_MS ?? 4000));

  // 3. INSERT through the authenticated (RLS-bound) client — simulates a user filling the form.
  let recordId = null;
  insertWaiter.arm();
  const { data: inserted, error: insertError } = await supabase
    .from(TABLE)
    .insert({
      entity_id: entityId,
      strategic_cycle_id: cycleId,
      title: tag,
      description: "Realtime QA record — safe to delete.",
      data: {},
      status: "draft"
    })
    .select("*")
    .single();

  if (insertError) {
    log(false, "db.insert", insertError.message);
  } else {
    recordId = inserted.id;
    log(true, "db.insert", `id=${recordId}`);
  }

  // 4. Assert the INSERT event arrived live.
  try {
    await insertWaiter.promise;
    log(true, "realtime.receivesInsert", "live INSERT propagated");
  } catch (e) {
    log(false, "realtime.receivesInsert", e.message);
  }

  // 5. UPDATE and assert the UPDATE event arrives live.
  if (recordId) {
    updateWaiter.arm();
    const { error: updateError } = await supabase.from(TABLE).update({ status: "ready_for_review" }).eq("id", recordId);
    if (updateError) log(false, "db.update", updateError.message);
    else log(true, "db.update", "status -> ready_for_review");

    try {
      await updateWaiter.promise;
      log(true, "realtime.receivesUpdate", "live UPDATE propagated");
    } catch (e) {
      log(false, "realtime.receivesUpdate", e.message);
    }
  }

  // 6. Clean up.
  if (recordId) {
    const { error: delError } = await cleanup.from(TABLE).delete().eq("id", recordId);
    log(!delError, "db.cleanup", delError ? delError.message : `removed id=${recordId}`);
  }

  await supabase.removeChannel(channel);
  await supabase.auth.signOut();

  console.log(failures === 0 ? "\nREALTIME QA: ALL PASS" : `\nREALTIME QA: ${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
