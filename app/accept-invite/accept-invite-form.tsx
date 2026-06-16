"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AcceptInviteForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("No active invite session was found. Ask an admin to create your account or open the invite link again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <label className="grid gap-1 text-sm font-semibold text-text">
        New password
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          type="password"
          autoComplete="new-password"
          className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal"
        />
      </label>
      {message ? <p className="rounded-md border border-warning-soft bg-warning-soft p-3 text-sm text-warning" role="alert">{message}</p> : null}
      <Button type="submit" disabled={loading}>{loading ? "Activating..." : "Set password and continue"}</Button>
    </form>
  );
}
