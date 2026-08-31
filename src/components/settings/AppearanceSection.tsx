"use client";

import { useTheme } from "@/components/theme/useTheme";
import { Segmented } from "@/components/ui";
import { THEMES, type Theme } from "@/lib/theme";
import styles from "@/app/(app)/settings/settings.module.css";

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section className={styles.section} aria-labelledby="appearance-heading">
      <div className={styles.head}>
        <h2 id="appearance-heading" className={styles.title}>
          Appearance
        </h2>
      </div>
      <div className={styles.body}>
        <div className={styles.row}>
          <span className={styles.label}>Theme</span>
          <Segmented
            label="Theme"
            value={theme}
            onChange={(next) => setTheme(next as Theme)}
            options={THEMES.map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            }))}
          />
        </div>
        <p className={styles.note}>
          Dark mode is its own palette, not an inversion. System follows your device.
        </p>
      </div>
    </section>
  );
}
