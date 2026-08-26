import styles from "./ScreenStub.module.css";

/**
 * Temporary. Each of these is replaced by the real screen in its own commit;
 * they exist so navigation is honest about where it leads.
 */
export function ScreenStub({ title, description }: { title: string; description: string }) {
  return (
    <div className={styles.stub}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
