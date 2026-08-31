import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { TransactionsView } from "@/components/transactions/TransactionsView";
import { getMockDataset } from "@/lib/finance/mock-data";

export const metadata: Metadata = { title: "Transactions — E-PON" };

export default async function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  await connection();

  const params = await searchParams;
  const now = new Date();

  return (
    // useSearchParams needs a boundary to suspend against during streaming.
    <Suspense fallback={null}>
      <TransactionsView
        dataset={getMockDataset(now)}
        nowIso={now.toISOString()}
        categoryColours={params.plain !== "1"}
      />
    </Suspense>
  );
}
