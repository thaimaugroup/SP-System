import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const message = searchParams?.error ? decodeURIComponent(searchParams.error) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-app-shell px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-card-hover">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-mark text-white shadow-primary"
          >
            <BrainCircuit className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Sign in to SIOS</h1>
            <p className="text-sm text-text-muted">Use an invited account linked to a SIOS entity and role.</p>
          </div>
        </div>
        <div className="mt-5 rounded-md border border-info-soft bg-info-soft p-3 text-sm leading-6 text-info">
          SIOS is invite-only for B2B governance. New accounts must be created by an owner or admin before they can access entity data.
        </div>
        <form action="/api/auth/login" method="post" className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm font-semibold text-text">
            Email
            <input
              name="email"
              required
              type="email"
              autoComplete="email"
              className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-text">
            Password
            <input
              name="password"
              required
              type="password"
              autoComplete="current-password"
              className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal"
            />
          </label>
          {message ? <p className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger" role="alert">{message}</p> : null}
          <Button type="submit">Sign in</Button>
        </form>
        <div className="mt-4 text-sm text-text-muted">
          Received an invitation?{" "}
          <Link href="/accept-invite" className="font-semibold text-primary hover:text-primary-hover">
            Activate your account
          </Link>
          .
        </div>
      </div>
    </main>
  );
}
