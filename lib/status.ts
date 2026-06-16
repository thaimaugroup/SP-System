export type StatusDomain = "record" | "workspace" | "import" | "approval" | "ai" | "system";

export type StatusTone = "success" | "info" | "warning" | "danger" | "neutral";

export type StatusMeta = {
  label: string;
  description: string;
  tone: StatusTone;
};

const STATUS_META: Record<StatusDomain, Record<string, StatusMeta>> = {
  record: {
    draft: {
      label: "Draft",
      description: "Editable working data that is not trusted for downstream use.",
      tone: "info"
    },
    import_staged: {
      label: "Import staged",
      description: "Imported row is staged and waiting for validation or commit.",
      tone: "warning"
    },
    ai_draft: {
      label: "AI draft",
      description: "AI-generated output that must be reviewed by a human.",
      tone: "warning"
    },
    ready_for_review: {
      label: "Ready for review",
      description: "Record is waiting in the human approval queue.",
      tone: "warning"
    },
    approved: {
      label: "Approved",
      description: "Trusted strategic data that downstream workspaces and AI can use.",
      tone: "success"
    },
    rejected: {
      label: "Rejected",
      description: "Reviewed and declined; retained for audit history.",
      tone: "danger"
    },
    archived: {
      label: "Archived",
      description: "Retained historical data that is no longer active.",
      tone: "neutral"
    },
    superseded: {
      label: "Superseded",
      description: "Replaced by a newer approved version.",
      tone: "neutral"
    }
  },
  workspace: {
    not_started: {
      label: "Not started",
      description: "No meaningful workspace data has been created yet.",
      tone: "neutral"
    },
    in_progress: {
      label: "In progress",
      description: "Workspace has data, but it is not fully reviewed.",
      tone: "info"
    },
    ready_for_review: {
      label: "Ready for review",
      description: "Workspace is ready for human review and approval.",
      tone: "warning"
    },
    approved: {
      label: "Approved",
      description: "Workspace output is trusted for downstream use.",
      tone: "success"
    },
    active: {
      label: "Active",
      description: "Workspace is active and available for strategic work.",
      tone: "success"
    },
    rejected: {
      label: "Rejected",
      description: "Workspace review found issues that need correction.",
      tone: "danger"
    },
    archived: {
      label: "Archived",
      description: "Workspace data is retained but no longer active.",
      tone: "neutral"
    }
  },
  import: {
    uploaded: {
      label: "Uploaded",
      description: "File metadata was saved and parsing has started.",
      tone: "info"
    },
    validated: {
      label: "Validated",
      description: "Rows passed validation and are ready to commit.",
      tone: "success"
    },
    validated_with_errors: {
      label: "Validated with errors",
      description: "Some rows need correction before they can be committed.",
      tone: "warning"
    },
    committed: {
      label: "Committed",
      description: "Valid rows were written into workspace tables.",
      tone: "success"
    },
    failed: {
      label: "Failed",
      description: "Import stopped because parsing, storage, validation, or commit failed.",
      tone: "danger"
    }
  },
  approval: {
    pending: {
      label: "Pending",
      description: "Waiting for a human reviewer to approve or reject.",
      tone: "warning"
    },
    approved: {
      label: "Approved",
      description: "Reviewer promoted the record to trusted strategic data.",
      tone: "success"
    },
    rejected: {
      label: "Rejected",
      description: "Reviewer declined the record and preserved the audit trail.",
      tone: "danger"
    },
    changes_requested: {
      label: "Changes requested",
      description: "Reviewer asked for edits before approval.",
      tone: "warning"
    },
    cancelled: {
      label: "Cancelled",
      description: "Review request was cancelled before completion.",
      tone: "neutral"
    }
  },
  ai: {
    queued: {
      label: "Queued",
      description: "AI generation is waiting to run.",
      tone: "neutral"
    },
    running: {
      label: "Running",
      description: "AI generation is currently processing.",
      tone: "info"
    },
    succeeded: {
      label: "Succeeded",
      description: "AI generation completed and produced a reviewable draft.",
      tone: "success"
    },
    failed: {
      label: "Failed",
      description: "AI generation failed and should be retried or inspected.",
      tone: "danger"
    },
    approved: {
      label: "Approved",
      description: "AI output was reviewed and approved by a human.",
      tone: "success"
    },
    rejected: {
      label: "Rejected",
      description: "AI output was reviewed and rejected by a human.",
      tone: "danger"
    },
    reviewed: {
      label: "Reviewed",
      description: "AI output has completed human review.",
      tone: "success"
    }
  },
  system: {
    active: {
      label: "Active",
      description: "Available and enabled.",
      tone: "success"
    },
    disabled: {
      label: "Disabled",
      description: "Not currently available.",
      tone: "neutral"
    }
  }
};

const fallback = (status?: string | null): StatusMeta => ({
  label: status ? status.replaceAll("_", " ") : "Unknown",
  description: "Status has not been documented yet.",
  tone: "neutral"
});

export function getStatusMeta(domain: StatusDomain, status?: string | null): StatusMeta {
  if (!status) return fallback(status);
  return STATUS_META[domain][status] ?? fallback(status);
}

export function getAnyStatusMeta(status?: string | null): StatusMeta {
  if (!status) return fallback(status);
  for (const domain of Object.keys(STATUS_META) as StatusDomain[]) {
    const meta = STATUS_META[domain][status];
    if (meta) return meta;
  }
  return fallback(status);
}
