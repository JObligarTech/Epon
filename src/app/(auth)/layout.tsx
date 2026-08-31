import { Logo } from "@/components/ui";
import styles from "./auth.module.css";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={styles.split}>
      <aside className={styles.aside}>
        <div className={styles.asideBrand}>
          <Logo />
        </div>
        <div>
          <h1 className={styles.claim}>
            Every account, <em>one clear view.</em>
          </h1>
          <p className={styles.sub}>
            E-PON brings your checking, savings and cards together so you always know what you
            have — and what&rsquo;s still on its way.
          </p>
        </div>
        <div className={styles.asideFoot}>
          <span>Read-only connections · You choose what to link</span>
          <span className={styles.expand}>
            Electronic Personal-finance Organization &amp; Navigation
          </span>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.mobileBrand}>
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
