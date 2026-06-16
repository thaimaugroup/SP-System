import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-text transition duration-200 hover:bg-surface-muted"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Logout
      </button>
    </form>
  );
}
