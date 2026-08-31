import { formatMoney, shareOf } from "@/lib/money";
import type { CSSProperties } from "react";
import type { InstitutionGroup } from "@/lib/finance/derive";
import type { Account, InstitutionHue } from "@/lib/finance/types";
import styles from "./PositionRail.module.css";

/**
 * One instrument answering "where is it": cash segmented by institution above
 * the line, card debt drawn to the same scale below it, so the proportion
 * between them is readable rather than stated.
 *
 * Colour identifies the institution; a hard ramp step separates two accounts
 * inside one. The bar itself is hidden from assistive tech — the legend under
 * it names every segment with its balance, which is the same information in a
 * form a screen reader can actually use.
 */
export function PositionRail({
  cashGroups,
  creditAccounts,
  totalCashMinor,
  totalDebtMinor,
}: {
  cashGroups: InstitutionGroup[];
  creditAccounts: Account[];
  totalCashMinor: number;
  totalDebtMinor: number;
}) {
  // Never fully invisible: a small balance still has to be findable.
  const debtWidth = Math.max(1.6, shareOf(totalDebtMinor, totalCashMinor) * 100);

  return (
    <div className={styles.rail}>
      <div className={styles.row}>
        <span className={styles.label}>Cash</span>
        <div className={styles.bar} aria-hidden="true">
          {cashGroups.map((group) => (
            <span
              key={group.institution.id}
              className={styles.group}
              style={grow(shareOf(group.totalMinor, totalCashMinor) * 100)}
            >
              {group.accounts.map((account, index) => (
                <i
                  key={account.id}
                  className={styles.segment}
                  style={{
                    ...grow(shareOf(account.currentBalanceMinor, group.totalMinor) * 100),
                    background: rampStep(group.institution.hue, index),
                  }}
                />
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.axis} />

      <div className={styles.row}>
        <span className={styles.label}>Cards</span>
        <div className={styles.bar} aria-hidden="true">
          <span className={styles.group} style={grow(debtWidth)}>
            <i className={`${styles.segment} ${styles.debt}`} style={grow(1)} />
          </span>
          <span style={grow(100 - debtWidth)} />
        </div>
      </div>

      <dl className={styles.legend}>
        {cashGroups.map((group) => (
          <div key={group.institution.id} className={styles.legendGroup}>
            <dt className={styles.legendName}>{group.institution.name}</dt>
            <dd className={styles.legendItems}>
              {group.accounts.map((account, index) => (
                <span key={account.id} className={styles.legendItem}>
                  <i
                    className={styles.swatch}
                    style={{ background: rampStep(group.institution.hue, index) }}
                    aria-hidden="true"
                  />
                  <b>{account.name}</b>
                  <span className="num">{formatMoney(account.currentBalanceMinor)}</span>
                </span>
              ))}
            </dd>
          </div>
        ))}

        {creditAccounts.length > 0 ? (
          <div className={styles.legendGroup}>
            <dt className={styles.legendName}>Cards</dt>
            <dd className={styles.legendItems}>
              {creditAccounts.map((account) => (
                <span key={account.id} className={styles.legendItem}>
                  <i className={styles.swatch} style={{ background: "var(--debt)" }} aria-hidden="true" />
                  <b>{account.name}</b>
                  <span className="num">{formatMoney(account.currentBalanceMinor)}</span>
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

/**
 * Longhands, not the `flex` shorthand. They behave identically in a browser,
 * and jsdom's CSSOM rejects the shorthand outright — React's style write then
 * produces no style attribute at all, which makes these proportions untestable.
 */
function grow(factor: number): CSSProperties {
  return { flexGrow: factor, flexShrink: 1, flexBasis: 0 };
}

/**
 * Step 0 is the institution's mark colour; step 1 is its second ramp step,
 * which moves away from the surface — darker in light mode, lighter in dark —
 * so both accounts stay legible. Beyond two, fade the second step; more than
 * two cash accounts at one institution is rare.
 */
function rampStep(hue: InstitutionHue, index: number): string {
  if (index === 0) return `var(--ins-${hue})`;
  if (index === 1) return `var(--ins-${hue}-2)`;
  return `color-mix(in srgb, var(--ins-${hue}-2) 55%, var(--surface))`;
}
