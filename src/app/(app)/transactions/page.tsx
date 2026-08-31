import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { TransactionsView } from "@/components/transactions/TransactionsView";
import { isEmpty, loadDataset } from "@/lib/finance/repository";
import { NoAccounts } from "@/components/finance/NoAccounts";

export const metadata: Metadata = { title: "Transactions — E-PON" };

export default async function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  await connection();

  const params = await searchParams;
  const now = new Date();
  const { dataset } = await loadDataset(now);

  if (isEmpty(dataset)) {
    return (
      <NoAccounts
        title="No transactions yet"
        body="Once a bank is connected, everything it reports will land here — pending and posted, grouped by day."
      />
    );
  }

  return (
    // useSearchParams needs a boundary to suspend against during streaming.
    <Suspense fallback={null}>
      <TransactionsView
        dataset={dataset}
        nowIso={now.toISOString()}
        categoryColours={params.plain !== "1"}
      />
    </Suspense>
  );
}
