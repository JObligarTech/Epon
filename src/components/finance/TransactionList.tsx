import type { Dataset, Transaction } from "@/lib/finance/types";
import { findAccount, findInstitution } from "@/lib/finance/derive";
import { TransactionRow } from "./TransactionRow";
import styles from "./TransactionList.module.css";

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
  return (
    <ul className={styles.list} aria-label={label}>
      {transactions.map((transaction) => {
        const account = findAccount(dataset, transaction.accountId);
        const institution = account ? findInstitution(dataset, account.institutionId) : undefined;
        // A transaction whose account is gone is a data fault, not something to
        // render half of.
        if (!account || !institution) return null;

        return (
          <li key={transaction.id} className={styles.item}>
            <TransactionRow
              transaction={transaction}
              account={account}
              institution={institution}
              showTime={showTime}
              secondary={secondary}
            />
          </li>
        );
      })}
    </ul>
  );
}
