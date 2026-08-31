"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { Button, Logo } from "@/components/ui";
import styles from "./TopBar.module.css";

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/accounts": "Accounts",
  "/transactions": "Transactions",
  "/budgeting": "Budgeting",
  "/settings": "Settings",
};

export function TopBar({
  onConnect,
  syncLabel,
}: {
  onConnect: () => void;
  syncLabel: string | null;
}) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "E-PON";

  return (
    <header className={styles.bar}>
      <span className={styles.mobileBrand}>
        <Logo size={18} />
      </span>
      {/* The rail already names the section on desktop; on phones the brand
          takes this slot, so the title is only ever announced once. */}
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.actions}>
        <SyncStatus label={syncLabel} />
        <Button variant="primary" className={styles.connect} onClick={onConnect}>
          <Icon name="plus" size={14} strokeWidth={1.7} />
          <span className={styles.connectLabel}>Connect</span>
        </Button>
      </div>
    </header>
  );
}
