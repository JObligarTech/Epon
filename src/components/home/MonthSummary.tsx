import { Icon } from "@/components/icons";
import { categoryColorVar } from "@/lib/finance/categories";
import type { CategoryTotal, MonthSummary as Summary } from "@/lib/finance/derive";
import { formatMoney, formatMoneyRounded, shareOf } from "@/lib/money";
import styles from "./MonthSummary.module.css";

const MAX_CATEGORIES = 5;

export function MonthSummary({
  monthName,
  summary,
  categories,
}: {
  monthName: string;
  summary: Summary;
  categories: CategoryTotal[];
}) {
  const top = categories.slice(0, MAX_CATEGORIES);
  const restMinor = categories.slice(MAX_CATEGORIES).reduce((sum, c) => sum + c.totalMinor, 0);

  const rows = [
    ...top.map((c) => ({ label: c.category, totalMinor: c.totalMinor, colour: categoryColorVar(c.category) })),
    ...(restMinor > 0
      ? [{ label: "Everything else", totalMinor: restMinor, colour: "var(--ink-3)" }]
      : []),
  ];

  // Bars are relative to the largest category, not the total: this compares
  // categories to each other, which is the question being asked.
  const largest = rows.reduce((max, row) => Math.max(max, row.totalMinor), 0);
  const keptShare = summary.inMinor === 0 ? 0 : Math.round(shareOf(summary.netMinor, summary.inMinor) * 100);

  return (
    <>
      <div className={styles.figures}>
        <Figure
          icon="arrowDown"
          label="Money in"
          value={formatMoney(summary.inMinor)}
          note={`${summary.depositCount} ${summary.depositCount === 1 ? "deposit" : "deposits"}`}
          tone="in"
        />
        <Figure
          icon="arrowUp"
          label="Money out"
          value={formatMoney(summary.outMinor)}
          note={`${summary.purchaseCount} ${summary.purchaseCount === 1 ? "purchase" : "purchases"}`}
        />
        <Figure
          icon="spark"
          label="Kept"
          value={formatMoney(summary.netMinor)}
          note={`${keptShare}% of what came in`}
        />
      </div>

      <div className={styles.categories}>
        <h3 className="srOnly">Spending by category in {monthName}</h3>
        <ul className={styles.bars}>
          {rows.map((row) => (
            <li key={row.label} className={styles.bar}>
              <i className={styles.dot} style={{ background: row.colour }} aria-hidden="true" />
              <span className={styles.barLabel}>{row.label}</span>
              <span className={styles.track} aria-hidden="true">
                <i
                  className={styles.fill}
                  style={{ width: `${shareOf(row.totalMinor, largest) * 100}%`, background: row.colour }}
                />
              </span>
              <span className={`num ${styles.barValue}`}>{formatMoneyRounded(row.totalMinor)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Figure({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: "arrowUp" | "arrowDown" | "spark";
  label: string;
  value: string;
  note: string;
  tone?: "in";
}) {
  return (
    <div className={styles.figure}>
      <span className={styles.figureLabel}>
        <Icon name={icon} size={12} strokeWidth={1.9} />
        {label}
      </span>
      <span className={`num ${styles.figureValue} ${tone === "in" ? styles.figureIn : ""}`}>
        {value}
      </span>
      <span className={styles.figureNote}>{note}</span>
    </div>
  );
}
