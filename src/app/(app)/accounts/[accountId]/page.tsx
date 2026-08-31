import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { accountTypeLabel, availableLabel } from "@/components/accounts/accountLabels";
import { UtilisationBar } from "@/components/accounts/UtilisationBar";
import { ConnectionStatus } from "@/components/finance/ConnectionStatus";
import { MonogramTile } from "@/components/finance/MonogramTile";
import { TransactionList } from "@/components/finance/TransactionList";
import { Icon } from "@/components/icons";
import { Section } from "@/components/ui";
import { formatRelativeTime } from "@/lib/dates";
import {
  creditUtilisation,
  findAccount,
  findInstitution,
  sortByRecency,
} from "@/lib/finance/derive";
import { getMockDataset } from "@/lib/finance/mock-data";
import { formatMoney, formatMoneyRounded, sumMinor } from "@/lib/money";
import styles from "./account.module.css";

const RECENT_COUNT = 10;

export async function generateMetadata({
  params,
}: PageProps<"/accounts/[accountId]">): Promise<Metadata> {
  const { accountId } = await params;
  const account = findAccount(getMockDataset(new Date()), accountId);
  return { title: account ? `${account.name} — E-PON` : "Account — E-PON" };
}

export default async function AccountPage({ params }: PageProps<"/accounts/[accountId]">) {
  await connection();

  const { accountId } = await params;
  const now = new Date();
  const dataset = getMockDataset(now);

  const account = findAccount(dataset, accountId);
  // An unknown id is a 404, not an empty screen pretending to be an account.
  if (!account) notFound();

  const institution = findInstitution(dataset, account.institutionId);
  if (!institution) notFound();

  const credit = account.type === "credit";
  const utilisation = creditUtilisation(account);
  const transactions = sortByRecency(
    dataset.transactions.filter((transaction) => transaction.accountId === account.id),
  );
  const pendingHeld = -sumMinor(
    transactions.filter((t) => t.status === "pending" && t.amountMinor < 0).map((t) => t.amountMinor),
  );

  return (
    <>
      <Link href="/accounts" className={styles.back}>
        <Icon name="chevron" size={13} strokeWidth={2} />
        Accounts
      </Link>

      <section className={styles.hero} aria-labelledby="account-name">
        <div className={styles.heroTop}>
          <div className={styles.identity}>
            <MonogramTile name={institution.name} hue={institution.hue} size={38} />
            <div>
              <h2 id="account-name" className={styles.name}>
                {account.name}
              </h2>
              <p className={styles.meta}>
                {institution.name} · {accountTypeLabel(account.type)} ·{" "}
                <span className="num">••••{account.mask}</span>
              </p>
            </div>
          </div>
          <ConnectionStatus
            status={institution.status}
            syncLabel={formatRelativeTime(new Date(institution.lastSyncedAt), now)}
          />
        </div>

        <div className={styles.balances}>
          <div>
            <span className="eyebrow">Current balance</span>
            <p className={`${styles.current} ${credit ? styles.owed : ""}`}>
              {formatMoney(account.currentBalanceMinor)}
            </p>
          </div>

          {account.availableBalanceMinor !== null ? (
            <div className={styles.availableBlock}>
              <span className="eyebrow">{availableLabel(account)}</span>
              <p className={`num ${styles.available}`}>
                {formatMoney(account.availableBalanceMinor)}
              </p>
              <p className={styles.explain}>
                {credit
                  ? `Limit ${formatMoneyRounded(account.creditLimitMinor ?? 0)} · ${Math.round((utilisation ?? 0) * 100)}% used`
                  : pendingHeld > 0
                    ? `${formatMoney(pendingHeld)} in pending charges is held back`
                    : "Nothing pending right now"}
              </p>
            </div>
          ) : null}
        </div>

        {utilisation !== null ? <UtilisationBar used={utilisation} thick /> : null}
      </section>

      <div className={styles.activity}>
        <Section
          title="Activity"
          action={
            <Link href={`/transactions?account=${account.id}`} className={styles.link}>
              Open in Transactions
            </Link>
          }
          flush
        >
          {transactions.length > 0 ? (
            <TransactionList
              transactions={transactions.slice(0, RECENT_COUNT)}
              dataset={dataset}
              showTime
              secondary="institution"
              label={`Activity for ${account.name}`}
            />
          ) : (
            <p className={styles.empty}>
              Nothing here yet. Transactions appear as your bank reports them.
            </p>
          )}
        </Section>
      </div>
    </>
  );
}
