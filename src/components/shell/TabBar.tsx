"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { isActivePath } from "@/lib/nav";
import styles from "./TabBar.module.css";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/accounts", label: "Accounts", icon: "accounts" },
  { href: "/transactions", label: "Activity", icon: "transactions" },
];

export function TabBar({
  onConnect,
  onMore,
  moreOpen,
}: {
  onConnect: () => void;
  onMore: () => void;
  moreOpen: boolean;
}) {
  const pathname = usePathname();
  const moreIsCurrent = isActivePath(pathname, "/settings") || isActivePath(pathname, "/budgeting");

  return (
    <nav className={styles.bar} aria-label="Sections">
      {TABS.slice(0, 2).map((tab) => (
        <TabLink key={tab.href} {...tab} pathname={pathname} />
      ))}

      <button type="button" className={[styles.tab, styles.mid].join(" ")} onClick={onConnect}>
        <span className={styles.fab}>
          <Icon name="plus" size={16} strokeWidth={1.9} />
        </span>
        <span>Connect</span>
      </button>

      <TabLink {...TABS[2]} pathname={pathname} />

      <button
        type="button"
        className={[styles.tab, moreIsCurrent ? styles.active : ""].filter(Boolean).join(" ")}
        onClick={onMore}
        aria-expanded={moreOpen}
        aria-haspopup="dialog"
      >
        <Icon name="more" size={19} />
        <span>More</span>
      </button>
    </nav>
  );
}

function TabLink({
  href,
  label,
  icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: IconName;
  pathname: string;
}) {
  const active = isActivePath(pathname, href);
  return (
    <Link
      href={href}
      className={[styles.tab, active ? styles.active : ""].filter(Boolean).join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <Icon name={icon} size={19} />
      <span>{label}</span>
    </Link>
  );
}
