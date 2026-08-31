"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui";
import { TransactionDetail } from "@/components/transactions/TransactionDetail";
import { findAccount, findInstitution } from "@/lib/finance/derive";
import type { Dataset, Transaction } from "@/lib/finance/types";
import { TransactionRow } from "./TransactionRow";
import styles from "./TransactionList.module.css";

/**
 * Rows are buttons, and the detail opens in the same sheet everywhere the list
 * appears — Home and Transactions behave identically rather than one being
 * inert because it happened to be built first.
 */
export function TransactionList({
  transactions,
  dataset,
  showTime = false,
  secondary = "account",
  label,
}: {
  transactions: Transaction[];
  dataset: Dataset;
  showTime?: boolean;
  secondary?: "account" | "institution";
  label: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = transactions.find((transaction) => transaction.id === selectedId) ?? null;
  const selectedAccount = selected ? findAccount(dataset, selected.accountId) : undefined;
  const selectedInstitution = selectedAccount
    ? findInstitution(dataset, selectedAccount.institutionId)
    : undefined;

  return (
    <>
      <ul className={styles.list} aria-label={label}>
        {transactions.map((transaction) => {
          const account = findAccount(dataset, transaction.accountId);
          const institution = account ? findInstitution(dataset, account.institutionId) : undefined;
          // A transaction whose account is gone is a data fault, not something
          // to render half of.
          if (!account || !institution) return null;

          return (
            <li key={transaction.id} className={styles.item}>
              <button
                type="button"
                className={styles.trigger}
                onClick={() => setSelectedId(transaction.id)}
              >
                <TransactionRow
                  transaction={transaction}
                  account={account}
                  institution={institution}
                  showTime={showTime}
                  secondary={secondary}
                />
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title="Transaction"
      >
        {selected && selectedAccount && selectedInstitution ? (
          <TransactionDetail
            transaction={selected}
            account={selectedAccount}
            institution={selectedInstitution}
          />
        ) : null}
      </Sheet>
    </>
  );
}
