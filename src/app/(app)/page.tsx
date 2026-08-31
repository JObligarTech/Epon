import Link from "next/link";
import { connection } from "next/server";
import { Icon } from "@/components/icons";
import { MonogramTile } from "@/components/finance/MonogramTile";
import { TransactionList } from "@/components/finance/TransactionList";
import { MonthSummary } from "@/components/home/MonthSummary";
import { PositionRail } from "@/components/home/PositionRail";
import { CountUp, Section, Tag } from "@/components/ui";
import {
  creditAccounts,
  findInstitution,
  groupByInstitution,
  netPositionMinor,
  pendingOutflowMinor,
  pendingTransactions,
  sortByRecency,
  spendByCategory,
  summariseMonth,
  totalCashMinor,
  totalDebtMinor,
} from "@/lib/finance/derive";
import { getMockDataset } from "@/lib/finance/mock-data";
import { formatMoney, formatMoneyRounded, MINUS } from "@/lib/money";
import styles from "./home.module.css";

const RECENT_COUNT = 7;
const IN_FLIGHT_COUNT = 3;

export default async function HomePage() {
  // Without this Next prerenders the route at build time, freezing new Date()
  // to whenever the build ran — "Today" would mean the day it deployed. Once
  // the data is per-user this route is dynamic anyway.
  await connection();

  // One clock for the whole render. Everything downstream is a pure function of
  // it, so the server and the client cannot disagree about what "today" means.
  const now = new Date();
  const dataset = getMockDataset(now);

  const cash = totalCashMinor(dataset);
  const debt = totalDebtMinor(dataset);
  const net = netPositionMinor(dataset);
  const summary = summariseMonth(dataset, now);
  const pending = pendingTransactions(dataset);
  const recent = sortByRecency(dataset.transactions).slice(0, RECENT_COUNT);
  const monthName = now.toLocaleDateString("en-US", { month: "long" });
  const gained = summary.netMinor >= 0;

  return (
    <>
      <section className={styles.hero} aria-labelledby="net-position-label">
        <div className={styles.heroTop}>
          <div>
            <span className="eyebrow" id="net-position-label">
              Net position
            </span>
            <p className={styles.netPosition}>
              <CountUp valueMinor={net} />
            </p>
            <p className={`${styles.delta} ${gained ? "" : styles.deltaDown}`}>
              <Icon name={gained ? "arrowUp" : "arrowDown"} size={12} strokeWidth={2} />
              <span className="num">
                {gained ? "+" : MINUS}
                {formatMoneyRounded(summary.netMinor)}
              </span>{" "}
              in {monthName}
            </p>
          </div>

          <div className={styles.heroSide}>
            <div>
              <span className={styles.heroSideLabel}>Cash on hand</span>
              <span className={`num ${styles.heroSideValue}`}>{formatMoney(cash)}</span>
            </div>
            <div>
              <span className={styles.heroSideLabel}>Owed on cards</span>
              <span className={`num ${styles.heroSideValue} ${styles.owed}`}>
                {formatMoney(debt)}
              </span>
            </div>
          </div>
        </div>

        <PositionRail
          cashGroups={groupByInstitution(dataset, { include: "cash" })}
          creditAccounts={creditAccounts(dataset)}
          totalCashMinor={cash}
          totalDebtMinor={debt}
        />
      </section>

      <div className={styles.grid}>
        <div className={styles.stack}>
          <Section title={`${monthName} so far`} flush>
            <MonthSummary
              monthName={monthName}
              summary={summary}
              categories={spendByCategory(dataset, now)}
            />
          </Section>

          <Section
            title="Recent activity"
            action={
              <Link href="/transactions" className={styles.link}>
                View all
              </Link>
            }
            flush
          >
            <TransactionList
              transactions={recent}
              dataset={dataset}
              showTime
              label="Recent activity"
            />
          </Section>
        </div>

        <div className={styles.stack}>
          <div className={styles.reserved}>
            <div className={styles.reservedHead}>
              <span className={`eyebrow ${styles.reservedEyebrow}`}>Safe to spend</span>
              <span className={styles.reservedTag}>
                <Tag tone="accent">With budgeting</Tag>
              </span>
            </div>
            <p className={styles.reservedGhost} aria-hidden="true">
              $0,000
            </p>
            <p className={styles.reservedBody}>
              Once you set a monthly budget, E-PON will show what is genuinely free to spend
              after bills, goals and card payments.
            </p>
          </div>

          <Section title="In flight" action={<Tag>{String(pending.length)}</Tag>} flush>
            <p className={`${styles.inFlightNote} ${styles.padded}`}>
              {pending.length > 0 ? (
                <>
                  <span className="num">{formatMoney(pendingOutflowMinor(dataset))}</span> in
                  pending charges has left your available balance but has not posted yet.
                </>
              ) : (
                <>Nothing pending. Every transaction your banks have sent us has posted.</>
              )}
            </p>
            {pending.length > 0 ? (
              <TransactionList
                transactions={sortByRecency(pending).slice(0, IN_FLIGHT_COUNT)}
                dataset={dataset}
                secondary="institution"
                label="Pending transactions"
              />
            ) : null}
          </Section>

          <Section
            title="Accounts"
            action={
              <Link href="/accounts" className={styles.link}>
                All
              </Link>
            }
            flush
          >
            <ul className={styles.plainList}>
              {dataset.accounts.map((account) => {
                const institution = findInstitution(dataset, account.institutionId);
                if (!institution) return null;
                const credit = account.type === "credit";

                return (
                  <li key={account.id}>
                    <Link href="/accounts" className={styles.accountRow}>
                      <MonogramTile name={institution.name} hue={institution.hue} size={34} />
                      <span>
                        <span className={styles.accountName}>{account.name}</span>
                        <span className={styles.accountDetail}>
                          {institution.name} <span className="num">••{account.mask}</span>
                        </span>
                      </span>
                      <span className={styles.accountAmount}>
                        <span
                          className={`num ${styles.accountBalance} ${credit ? styles.owed : ""}`}
                        >
                          {formatMoney(account.currentBalanceMinor)}
                        </span>
                        <span className={styles.accountNote}>
                          {credit
                            ? "owed"
                            : account.availableBalanceMinor !== null
                              ? `${formatMoneyRounded(account.availableBalanceMinor)} available`
                              : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
