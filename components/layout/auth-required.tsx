import { LockKeyhole } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function AuthRequired() {
  return (
    <div className="py-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex justify-center">
          <LockKeyhole className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <EmptyState
          title="Sign in to access SIOS"
          description="SIOS uses Supabase Auth and row-level security. Sign in with a user that has a role in user_entity_roles for the target entity."
          actionHref="/login"
          actionLabel="Open login"
        />
      </div>
    </div>
  );
}

