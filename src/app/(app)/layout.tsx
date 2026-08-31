import { AppShell } from "@/components/shell/AppShell";
import { hasPlaidConfig } from "@/lib/env";

export default function AppLayout({ children }: LayoutProps<"/">) {
  // Whether bank connections are available is a server fact; the shell only
  // needs the answer, never the credentials behind it.
  return <AppShell plaidEnabled={hasPlaidConfig()}>{children}</AppShell>;
}
