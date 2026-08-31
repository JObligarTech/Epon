import { AppShell } from "@/components/shell/AppShell";
import { formatRelativeTime } from "@/lib/dates";
import { hasPlaidConfig } from "@/lib/env";
import { loadDataset } from "@/lib/finance/repository";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const now = new Date();
  const { dataset, source } = await loadDataset(now);

  // The most recent sync across every connection. Formatted here rather than in
  // the browser: recomputing relative time on the client would disagree with
  // what the server rendered.
  const lastSynced = dataset.institutions
    .map((institution) => Date.parse(institution.lastSyncedAt))
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => b - a)
    .at(0);

  const syncLabel =
    source === "database" && lastSynced !== undefined
      ? formatRelativeTime(new Date(lastSynced), now)
      : null;

  return (
    <AppShell plaidEnabled={hasPlaidConfig()} syncLabel={syncLabel}>
      {children}
    </AppShell>
  );
}
