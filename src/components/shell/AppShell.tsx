"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { ConnectFlow } from "@/components/connect/ConnectFlow";
import { Sheet, Tag } from "@/components/ui";
import { PLANNED_SECTIONS, PRIMARY_NAV, SETTINGS_NAV } from "@/lib/nav";
import { NavRail } from "./NavRail";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";
import styles from "./AppShell.module.css";

export function AppShell({
  children,
  plaidEnabled,
  syncLabel,
}: {
  children: ReactNode;
  plaidEnabled: boolean;
  /** Null when there is nothing to sync — sample data, or no connections. */
  syncLabel: string | null;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  const sheetOpen = moreOpen || connectOpen;

  // A sheet left open across a navigation covers the page you asked for. The
  // shell behind is inert while a sheet is open, so the only links that can be
  // followed are the sheet's own — closing here rather than reacting to the
  // pathname keeps this out of an effect.
  const closeMore = () => setMoreOpen(false);

  return (
    <>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      {/* Inert while a sheet is open, so neither the keyboard nor a screen
          reader can reach the page behind it. */}
      <div className={styles.shell} inert={sheetOpen ? true : undefined}>
        <NavRail />
        <div className={styles.main}>
          <TopBar onConnect={() => setConnectOpen(true)} syncLabel={syncLabel} />
          <main id="main" className={styles.page} tabIndex={-1}>
            {children}
          </main>
        </div>
        <TabBar
          onConnect={() => setConnectOpen(true)}
          onMore={() => setMoreOpen(true)}
          moreOpen={moreOpen}
        />
      </div>

      <Sheet open={moreOpen} onClose={closeMore} title="More">
        <ul className={styles.sheetNav}>
          {PRIMARY_NAV.filter((item) => item.soon).map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={styles.sheetLink} onClick={closeMore}>
                <Icon name={item.icon} size={17} />
                <span>{item.label}</span>
                <span className={styles.sheetTrailing}>
                  <Tag tone="accent">Soon</Tag>
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={SETTINGS_NAV.href} className={styles.sheetLink} onClick={closeMore}>
              <Icon name={SETTINGS_NAV.icon} size={17} />
              <span>{SETTINGS_NAV.label}</span>
            </Link>
          </li>
        </ul>

        <hr className={styles.sheetDivider} />
        <p className="eyebrow">Planned</p>
        <ul className={styles.sheetNav}>
          {PLANNED_SECTIONS.map((section) => (
            <li key={section.label} className={[styles.sheetLink, styles.sheetPlanned].join(" ")}>
              <Icon name={section.icon} size={17} />
              <span>{section.label}</span>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        title="Connect an account"
      >
        <ConnectFlow enabled={plaidEnabled} />
      </Sheet>
    </>
  );
}
