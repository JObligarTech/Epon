"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme/useTheme";
import {
  Button,
  Chip,
  Input,
  Logo,
  Segmented,
  Skeleton,
  Tag,
  Toggle,
} from "@/components/ui";
import { THEMES, type Theme } from "@/lib/theme";
import styles from "./styleguide.module.css";

const SURFACES = ["--ground", "--surface", "--surface-2", "--surface-3"];
const INK = ["--ink", "--ink-2", "--ink-3"];
const BRAND = ["--accent", "--accent-ink", "--accent-soft", "--debt", "--debt-soft"];
const STATUS = ["--warn", "--warn-soft", "--alert", "--focus", "--on-accent"];

const CATEGORIES = [
  ["Dining", "--cat-dining"],
  ["Shopping", "--cat-shopping"],
  ["Transport", "--cat-transport"],
  ["Groceries", "--cat-groceries"],
  ["Bills", "--cat-bills"],
  ["Housing", "--cat-housing"],
  ["Subscriptions", "--cat-subs"],
  ["Health", "--cat-health"],
] as const;

const INSTITUTIONS = [
  ["Marine", "--ins-marine", "--ins-marine-2", "--tile-marine"],
  ["Mulberry", "--ins-mulberry", "--ins-mulberry-2", "--tile-mulberry"],
  ["Bronze", "--ins-bronze", "--ins-bronze-2", "--tile-bronze"],
  ["Pine", "--ins-pine", "--ins-pine-2", "--tile-pine"],
  ["Violet", "--ins-violet", "--ins-violet-2", "--tile-violet"],
  ["Teal", "--ins-teal", "--ins-teal-2", "--tile-teal"],
] as const;

const TYPE_SCALE = [
  ["Display figure", "num", { fontSize: 52, fontWeight: 300, letterSpacing: "-0.045em" }],
  ["Section figure", "num", { fontSize: 21, fontWeight: 400, letterSpacing: "-0.035em" }],
  ["Row figure", "num", { fontSize: 14 }],
  ["Page title", "", { fontSize: 27, fontWeight: 600, letterSpacing: "-0.03em" }],
  ["Section heading", "", { fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em" }],
  ["Body", "", { fontSize: 15 }],
  ["Meta", "", { fontSize: 12, color: "var(--ink-3)" }],
] as const;

function Swatch({ token, label }: { token: string; label?: string }) {
  return (
    <div className={styles.swatch}>
      <span className={styles.chipColor} style={{ background: `var(${token})` }} />
      <span className={styles.swatchMeta}>
        <span className={styles.swatchName}>{label ?? token.replace(/^--/, "")}</span>
        <span className={`${styles.swatchToken} num`}>{token}</span>
      </span>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {note ? <p className={styles.sectionNote}>{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  const { theme, setTheme } = useTheme();
  const [chip, setChip] = useState(true);
  const [toggle, setToggle] = useState(true);
  const [segment, setSegment] = useState("all");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Logo />
        <div className={styles.headerRight}>
          <Segmented
            label="Theme"
            value={theme}
            onChange={(next) => setTheme(next as Theme)}
            options={THEMES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))}
          />
        </div>
      </header>

      <p className={styles.lede}>
        The design system, on one page. Every colour below is a token read from{" "}
        <code className="num">tokens.css</code>; nothing here declares a colour of its own.
        Switch the theme above to check both.
      </p>

      <Section title="Surfaces and ink">
        <div className={styles.swatchGrid}>
          {[...SURFACES, ...INK].map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </div>
      </Section>

      <Section title="Brand and status" note="Semantic colour is separate from the accent hue.">
        <div className={styles.swatchGrid}>
          {[...BRAND, ...STATUS].map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </div>
      </Section>

      <Section
        title="Category palette"
        note="Eight slots in fixed CVD-safe order. Worst adjacent pair: ΔE 18.1 light, 15.0 dark."
      >
        <div className={styles.swatchGrid}>
          {CATEGORIES.map(([label, token]) => (
            <Swatch key={token} token={token} label={label} />
          ))}
        </div>
      </Section>

      <Section
        title="Institution palette"
        note="Mark colour, the second-account ramp step, and the deep monogram tile."
      >
        <div className={styles.insGrid}>
          {INSTITUTIONS.map(([label, mark, step2, tile]) => (
            <div key={label} className={styles.insRow}>
              <span className={styles.tile} style={{ background: `var(${tile})` }}>
                {label.slice(0, 2).toUpperCase()}
              </span>
              <span className={styles.insName}>{label}</span>
              <span className={styles.ramp}>
                <i style={{ background: `var(${mark})` }} />
                <i style={{ background: `var(${step2})` }} />
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography" note="Schibsted Grotesk for interface, DM Mono for every figure.">
        <div className={styles.typeList}>
          {TYPE_SCALE.map(([label, cls, style]) => (
            <div key={label} className={styles.typeRow}>
              <span className={styles.typeLabel}>{label}</span>
              <span className={cls} style={style as React.CSSProperties}>
                {cls === "num" ? "$21,182.11" : "Every account, one clear view"}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Controls">
        <div className={styles.controls}>
          <Button variant="primary">Connect account</Button>
          <Button variant="ghost">Reconnect</Button>
          <Button variant="quiet">Sign out</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <div className={styles.controls}>
          <Chip active={chip} onClick={() => setChip((v) => !v)}>
            Category colours
          </Chip>
          <Tag>24 months</Tag>
          <Tag tone="accent">Soon</Tag>
          <Toggle checked={toggle} onChange={setToggle} label="Example toggle" />
          <Segmented
            label="Status"
            value={segment}
            onChange={setSegment}
            options={[
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "posted", label: "Posted" },
            ]}
          />
        </div>
        <div className={styles.inputs}>
          <Input placeholder="you@example.com" aria-label="Email" />
          <Input placeholder="Search merchant or category" aria-label="Search" />
        </div>
      </Section>

      <Section title="Loading">
        <div className={styles.skeletons}>
          <Skeleton width={180} height={22} />
          <Skeleton width={260} />
          <Skeleton width={120} />
        </div>
      </Section>
    </main>
  );
}
