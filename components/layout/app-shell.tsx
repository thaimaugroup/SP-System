import type { AppContext } from "@/lib/db/queries";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children, context }: { children: React.ReactNode; context: AppContext }) {
  return (
    <div className="min-h-dvh bg-app-shell">
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar context={context} />
          <main id="main-content" className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

