import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AcceptInviteForm } from "@/app/accept-invite/accept-invite-form";

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-white p-6">
        <div className="flex items-center gap-3">
          <KeyRound className="h-8 w-8 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-text">Activate invited account</h1>
            <p className="text-sm text-text-muted">SIOS accounts are created by an admin before login.</p>
          </div>
        </div>
        <div className="mt-6 space-y-4 text-sm leading-6 text-text-muted">
          <p>
            Open this page from a Supabase invitation link to set your password. If your admin created a demo password,
            return to login and sign in with that temporary password.
          </p>
          <p>
            Access is granted only after your user is assigned to an entity in Admin Center.
          </p>
        </div>
        <AcceptInviteForm />
        <Link
          href="/login"
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-text transition duration-200 hover:bg-surface-muted"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}
