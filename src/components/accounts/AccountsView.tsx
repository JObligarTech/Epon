"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { ConnectionStatus } from "@/components/finance/ConnectionStatus";
import { MonogramTile } from "@/components/finance/MonogramTile";
import { Button, Sheet, Tag } from "@/components/ui";
import { formatMoney, formatMoneyRounded } from "@/lib/money";
import type { Account, Institution } from "@/lib/finance/types";
import { accountTypeLabel } from "./accountLabels";
import { UtilisationBar } from "./UtilisationBar";
import styles from "./AccountsView.module.css";

export type InstitutionCard = {
  institution: Institution;
  accounts: Account[];
  /** Formatted on the server so the client never recomputes relative time. */
  syncLabel: string;
};

export function AccountsView({ cards }: { cards: InstitutionCard[] }) {
  const [reconnecting, setReconnecting] = useState<Institution | null>(null);

  return (
    <>
      <div className={styles.folios}>
        {cards.map(({ institution, accounts, syncLabel }) => (
          <section key={institution.id} className={styles.folio} aria-label={institution.name}>
            <header className={styles.folioHead}>
              <MonogramTile name={institution.name} hue={institution.hue} />
              <div className={styles.folioMeta}>
                <h2 className={styles.folioName}>
                  {institution.name}
                  {institution.isSample ? (
                    <span className={styles.sampleTag}>
                      <Tag>Sample</Tag>
                    </span>
                  ) : null}
                </h2>
                <ConnectionStatus status={institution.status} syncLabel={syncLabel} />
              </div>
              {institution.status === "reconnect_required" ? (
                <Button
                  className={styles.reconnect}
                  onClick={() => setReconnecting(institution)}
                >
                  Reconnect
                </Button>
              ) : null}
            </header>

            <ul className={styles.accounts}>
              {accounts.map((account) => (
                <li key={account.id}>
                  <Link href={`/accounts/${account.id}`} className={styles.accountRow}>
                    <span className={styles.glyph} aria-hidden="true">
                      <Icon name={account.type === "credit" ? "debt" : "bank"} size={15} />
                    </span>

                    <span className={styles.accountMeta}>
                      <span className={styles.accountName}>{account.name}</span>
                      <span className={styles.accountDetail}>
                        {accountTypeLabel(account.type)}
                        <span className={styles.separator}>·</span>
                        <span className="num">••••{account.mask}</span>
                        {account.apy !== null ? (
                          <>
                            <span className={styles.separator}>·</span>
                            {account.apy}% APY
                          </>
                        ) : null}
                      </span>
                      {account.creditLimitMinor ? (
                        <UtilisationBar
                          used={account.currentBalanceMinor / account.creditLimitMinor}
                        />
                      ) : null}
                    </span>

                    <span className={styles.amount}>
                      <span
                        className={[
                          "num",
                          styles.balance,
                          account.type === "credit" ? styles.owed : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {formatMoney(account.currentBalanceMinor)}
                      </span>
                      <span className={styles.note}>{availabilityNote(account)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Sheet
        open={reconnecting !== null}
        onClose={() => setReconnecting(null)}
        title="Reconnect"
      >
        <p className={styles.sheetBody}>
          {reconnecting?.name} needs to be signed into again — banks expire a connection
          periodically, and after a password change. Reconnecting arrives with the Plaid
          integration; balances and history are kept, not re-imported from scratch.
        </p>
      </Sheet>
    </>
  );
}

function availabilityNote(account: Account): string {
  if (account.type === "credit") {
    const used =
      account.creditLimitMinor !== null
        ? ` · ${Math.round((account.currentBalanceMinor / account.creditLimitMinor) * 100)}% used`
        : "";
    return account.availableBalanceMinor !== null
      ? `${formatMoneyRounded(account.availableBalanceMinor)} credit left${used}`
      : `Owed${used}`;
  }

  return account.availableBalanceMinor !== null
    ? `${formatMoneyRounded(account.availableBalanceMinor)} available`
    : "";
}
