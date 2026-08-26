import styles from "./page.module.css";

export default function Page() {
  return (
    <main className={styles.main}>
      <p className={styles.eyebrow}>E-PON</p>
      <h1 className={styles.title}>Deploy pipeline is live.</h1>
      <p className={styles.body}>
        Next.js 16, TypeScript and CSS Modules. This placeholder is replaced by
        the design system and app shell in the commits that follow.
      </p>
    </main>
  );
}
