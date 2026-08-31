import type { InstitutionHue } from "@/lib/finance/types";
import styles from "./MonogramTile.module.css";

/** Initials on the institution's deep tile colour. Decorative — the name is
 *  always adjacent in text, so this is hidden from assistive tech. */
export function MonogramTile({
  name,
  hue,
  size = 34,
}: {
  name: string;
  hue: InstitutionHue;
  size?: number;
}) {
  return (
    <span
      className={styles.tile}
      style={{
        background: `var(--tile-${hue})`,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}
