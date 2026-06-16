import { AppShell } from "@/components/layout/app-shell";
import { getAppContext } from "@/lib/db/queries";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const context = await getAppContext();
  return <AppShell context={context}>{children}</AppShell>;
}

