"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Logo, Tag } from "@/components/ui";
import { isActivePath, PLANNED_SECTIONS, PRIMARY_NAV, SETTINGS_NAV } from "@/lib/nav";
import styles from "./NavRail.module.css";

export function NavRail() {
  const pathname = usePathname();
  const [plannedOpen, setPlannedOpen] = useState(false);

  return (
    <nav className={styles.rail} aria-label="Main">
      <Link href="/" className={styles.brand} aria-label="E-PON home">
        <Logo size={19} />
      </Link>

      <ul className={styles.group}>
        {PRIMARY_NAV.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[styles.item, active ? styles.active : "", item.soon ? styles.soon : ""]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.soon ? (
                  <span className={styles.trailing}>
                    <Tag tone="accent">Soon</Tag>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <hr className={styles.divider} />

      <div className={styles.plannedHead}>
        <span className="eyebrow">Planned</span>
        <button
          type="button"
          className={styles.disclosure}
          onClick={() => setPlannedOpen((open) => !open)}
          aria-expanded={plannedOpen}
          aria-controls="planned-sections"
        >
          {plannedOpen ? "Hide" : "Show"}
        </button>
      </div>

      {/* Inert text, not links or buttons: these go nowhere, and announcing
          them as controls would be a lie. */}
      <ul className={styles.group} id="planned-sections" hidden={!plannedOpen}>
        {PLANNED_SECTIONS.map((section) => (
          <li key={section.label} className={[styles.item, styles.planned].join(" ")}>
            <Icon name={section.icon} />
            <span>{section.label}</span>
          </li>
        ))}
      </ul>

      <div className={styles.spacer} />

      <ul className={styles.group}>
        <li>
          <Link
            href={SETTINGS_NAV.href}
            className={[
              styles.item,
              isActivePath(pathname, SETTINGS_NAV.href) ? styles.active : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={isActivePath(pathname, SETTINGS_NAV.href) ? "page" : undefined}
          >
            <Icon name={SETTINGS_NAV.icon} />
            <span>{SETTINGS_NAV.label}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
