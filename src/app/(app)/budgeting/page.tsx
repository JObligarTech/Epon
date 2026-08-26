import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/icons";
import { Tag } from "@/components/ui";
import styles from "./budgeting.module.css";

export const metadata: Metadata = { title: "Budgeting — E-PON" };

const PLANNED: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "budgeting",
    title: "Monthly budgets",
    body: "Set what you intend to spend by category, then watch it draw down as the month goes.",
  },
  {
    icon: "spark",
    title: "Safe to spend",
    body: "One number on Home that already accounts for bills, goals and card payments.",
  },
  {
    icon: "debt",
    title: "Debt payoff",
    body: "Point extra money at a card or loan and see the payoff date move.",
  },
  {
    icon: "goals",
    title: "Savings goals",
    body: "Name a goal, fund it automatically, track it beside everything else.",
  },
  {
    icon: "recurring",
    title: "Recurring and bills",
    body: "E-PON spots the subscriptions and bills it already sees in your transactions.",
  },
  {
    icon: "insights",
    title: "Insights",
    body: "Plain-language notes on what changed this month and why.",
  },
];

export default function BudgetingPage() {
  return (
    <div className={styles.page}>
      <Tag tone="accent">In design</Tag>
      <h2 className={styles.title}>Budgeting is the next thing we build.</h2>
      <p className={styles.lede}>
        E-PON already reads your accounts and every transaction. Budgeting is the layer that
        turns that into a plan — and it will slot in here without moving anything you already use.
      </p>

      <ul className={styles.grid}>
        {PLANNED.map((item) => (
          <li key={item.title} className={styles.cell}>
            <span className={styles.icon}>
              <Icon name={item.icon} size={17} strokeWidth={1.6} />
            </span>
            <h3 className={styles.cellTitle}>{item.title}</h3>
            <p className={styles.cellBody}>{item.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
