import type { Metadata } from "next";
import { connection } from "next/server";
import { AccountsView, type InstitutionCard } from "@/components/accounts/AccountsView";
import { groupByInstitution, totalCashMinor, totalDebtMinor } from "@/lib/finance/derive";
import { isEmpty, loadDataset } from "@/lib/finance/repository";
import { NoAccounts } from "@/components/finance/NoAccounts";
import { formatRelativeTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import styles from "./accounts.module.css";

export const metadata: Metadata = { title: "Accounts — E-PON" };

export default async function AccountsPage() {
  await connection();

  const now = new Date();
  const { dataset } = await loadDataset(now);
  if (isEmpty(dataset)) return <NoAccounts />;
  const cash = totalCashMinor(dataset);
  const debt = totalDebtMinor(dataset);

  const cards: InstitutionCard[] = groupByInstitution(dataset).map((group) => ({
    institution: group.institution,
    accounts: group.accounts,
    syncLabel: formatRelativeTime(new Date(group.institution.lastSyncedAt), now),
  }));

  return (
    <>
      <header className={styles.header}>
        <div>
          <span className="eyebrow">
            Across {dataset.institutions.length}{" "}
            {dataset.institutions.length === 1 ? "institution" : "institutions"}
          </span>
          <p className={`num ${styles.total}`}>{formatMoney(cash)}</p>
          <p className={styles.subtotal}>
            in cash · <span className={`num ${styles.owed}`}>{formatMoney(debt)}</span> owed on
            cards
          </p>
        </div>
      </header>

      <AccountsView cards={cards} />

      <p className={styles.footnote}>
        Balances come from your bank on each sync. <b>Available</b> reflects pending activity and
        holds; <b>current</b> is what has fully posted.
      </p>
    </>
  );
}
