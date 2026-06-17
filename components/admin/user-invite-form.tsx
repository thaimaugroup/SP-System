"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const roles = [
  // PRD §10.1 roles
  { value: "system_admin", label: "System Admin" },
  { value: "group_admin", label: "Group Admin" },
  { value: "entity_admin", label: "Entity Admin" },
  { value: "workspace_owner", label: "Workspace Owner" },
  { value: "contributor", label: "Contributor" },
  { value: "reviewer", label: "Reviewer" },
  { value: "approver", label: "Approver" },
  { value: "viewer", label: "Viewer" },
  { value: "import_manager", label: "Import Manager" },
  { value: "ai_operator", label: "AI Operator" },
  { value: "auditor", label: "Auditor" }
];

export function UserInviteForm({
  entityId,
  disabled
}: {
  entityId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityId,
        email: form.get("email"),
        fullName: form.get("fullName"),
        title: form.get("title"),
        role: form.get("role"),
        temporaryPassword: form.get("temporaryPassword") || undefined
      })
    });
    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error ?? "Unable to create user.");
      setLoading(false);
      return;
    }

    setMessage(body.temporaryPasswordUsed ? "User created and confirmed with the temporary password." : "Invitation sent. User must accept the invite before login.");
    (event.currentTarget as HTMLFormElement).reset();
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-text">
          Email
          <input name="email" required type="email" className="min-h-10 rounded-md border border-border px-3 py-2 font-normal" disabled={disabled || loading} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-text">
          Full name
          <input name="fullName" required className="min-h-10 rounded-md border border-border px-3 py-2 font-normal" disabled={disabled || loading} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-text">
          Title
          <input name="title" className="min-h-10 rounded-md border border-border px-3 py-2 font-normal" disabled={disabled || loading} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-text">
          Role
          <select name="role" defaultValue="contributor" className="min-h-10 rounded-md border border-border px-3 py-2 font-normal" disabled={disabled || loading}>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold text-text">
        Temporary password
        <input name="temporaryPassword" type="password" minLength={8} className="min-h-10 rounded-md border border-border px-3 py-2 font-normal" disabled={disabled || loading} />
        <span className="text-xs font-normal text-text-muted">Leave empty to send a Supabase invite email when SMTP is configured.</span>
      </label>
      {message ? <p className="rounded-md border border-info-soft bg-info-soft p-3 text-sm text-info" role="status">{message}</p> : null}
      <Button type="submit" disabled={disabled || loading}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        {loading ? "Creating..." : "Create or invite user"}
      </Button>
    </form>
  );
}
