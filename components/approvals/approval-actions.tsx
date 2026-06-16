"use client";

import { useState } from "react";
import { Check, Edit2, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Action = "approve" | "reject" | "edit_and_approve" | "request_regeneration";

export function ApprovalActions({
  approvalId,
  requestType,
  disabled
}: {
  approvalId: string;
  requestType?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [notes, setNotes] = useState("");

  const isAiDraft = requestType === "ai_review";

  async function submit(action: Action, extra?: { editedTitle?: string; editedDescription?: string; notes?: string }) {
    setLoadingAction(action);
    setMessage(null);

    const response = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalId, action, ...extra })
    });
    const body = await response.json();
    setLoadingAction(null);

    if (!response.ok) {
      setMessage(body.error ?? "Unable to update approval.");
      return;
    }

    setShowEditForm(false);
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Main action row */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => submit("approve")}
          disabled={disabled || Boolean(loadingAction)}
        >
          <Check className="h-4 w-4" />
          {loadingAction === "approve" ? "Approving..." : "Approve"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => { setShowEditForm((v) => !v); setMessage(null); }}
          disabled={disabled || Boolean(loadingAction)}
        >
          <Edit2 className="h-4 w-4" />
          Edit & Approve
        </Button>

        {isAiDraft ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => submit("request_regeneration", { notes: "Reviewer requested new generation." })}
            disabled={disabled || Boolean(loadingAction)}
          >
            <RefreshCw className="h-4 w-4" />
            {loadingAction === "request_regeneration" ? "Regenerating..." : "Regenerate"}
          </Button>
        ) : null}

        <Button
          type="button"
          variant="danger"
          onClick={() => submit("reject", { notes: notes || undefined })}
          disabled={disabled || Boolean(loadingAction)}
        >
          <X className="h-4 w-4" />
          {loadingAction === "reject" ? "Rejecting..." : "Reject"}
        </Button>
      </div>

      {/* Inline edit form — shown when Edit & Approve is clicked */}
      {showEditForm ? (
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-subtle">
            Edit before approving — leave fields blank to keep existing values
          </p>
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-text">
              Title (optional edit)
              <input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Leave blank to keep current title"
                className="min-h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-text">
              Description (optional edit)
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Leave blank to keep current description"
                className="min-h-20 rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-text">
              Reviewer notes
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for the audit log"
                className="min-h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal"
              />
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() =>
                  submit("edit_and_approve", {
                    editedTitle: editedTitle || undefined,
                    editedDescription: editedDescription || undefined,
                    notes: notes || undefined
                  })
                }
                disabled={Boolean(loadingAction)}
              >
                <Check className="h-4 w-4" />
                {loadingAction === "edit_and_approve" ? "Saving & approving..." : "Save edits & approve"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowEditForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="text-sm text-danger" role="alert">{message}</p>
      ) : null}
    </div>
  );
}
