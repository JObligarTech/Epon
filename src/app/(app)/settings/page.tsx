"use client";

import { useTheme } from "@/components/theme/useTheme";
import { Segmented } from "@/components/ui";
import { THEMES, type Theme } from "@/lib/theme";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.page}>
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

      <section className={styles.section} aria-labelledby="rest-heading">
        <div className={styles.head}>
          <h2 id="rest-heading" className={styles.title}>
            Everything else
          </h2>
        </div>
        <div className={styles.body}>
          <p className={styles.note}>
            Profile, security, connected institutions and sync settings arrive once accounts and
            bank connections are real.
          </p>
        </div>
      </section>
    </div>
  );
}
