"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { BusinessRecord } from "@/types/database";

type ConnectionState = "connecting" | "live" | "error";

/**
 * Subscribes to Supabase Realtime postgres_changes for a single workspace table,
 * scoped to one entity, and keeps a live, sorted list of records.
 *
 * RLS is enforced on the realtime stream using the authenticated browser session,
 * so this only surfaces rows the signed-in user is already allowed to read.
 */
export function useLiveRecords(
  table: string,
  entityId: string,
  initialRecords: BusinessRecord[]
): { records: BusinessRecord[]; connection: ConnectionState; lastEventAt: number | null } {
  const [records, setRecords] = useState<BusinessRecord[]>(initialRecords);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  // Re-seed when the server-provided list changes (e.g. switching module/table).
  const seedKey = `${table}:${entityId}:${initialRecords.length}`;
  const seedRef = useRef<string>("");
  if (seedRef.current !== seedKey) {
    seedRef.current = seedKey;
  }

  useEffect(() => {
    setRecords(initialRecords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  useEffect(() => {
    if (!table || !entityId) return;

    const supabase = createSupabaseBrowserClient();
    const channel: RealtimeChannel = supabase
      .channel(`live:${table}:${entityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `entity_id=eq.${entityId}` },
        (payload) => {
          setLastEventAt(Date.now());
          setRecords((current) => reconcile(current, payload));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("error");
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, entityId]);

  return { records, connection, lastEventAt };
}

function reconcile(
  current: BusinessRecord[],
  payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }
): BusinessRecord[] {
  const next = payload.new as BusinessRecord | undefined;
  const old = payload.old as { id?: string } | undefined;

  if (payload.eventType === "DELETE") {
    if (!old?.id) return current;
    return current.filter((r) => r.id !== old.id);
  }

  if (!next?.id) return current;

  if (payload.eventType === "INSERT") {
    if (current.some((r) => r.id === next.id)) return current;
    return sortByUpdated([next, ...current]);
  }

  // UPDATE
  if (current.some((r) => r.id === next.id)) {
    return sortByUpdated(current.map((r) => (r.id === next.id ? { ...r, ...next } : r)));
  }
  return sortByUpdated([next, ...current]);
}

function sortByUpdated(records: BusinessRecord[]): BusinessRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}
