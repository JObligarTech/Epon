import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { loadSampleData } from "@/lib/finance/seed-actions";
import styles from "./NoAccounts.module.css";

/**
 * What a new account sees. Not an error and not a broken-looking dashboard of
 * zeroes — a starting point that says what to do next.
 */
export function NoAccounts({
  title = "Nothing connected yet",
  body = "Link a bank or card and E-PON will pull in your balances and the last two years of transactions.",
  offerSample = true,
}: {
  title?: string;
  body?: string;
  offerSample?: boolean;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.glyph} aria-hidden="true">
        <Icon name="bank" size={24} strokeWidth={1.5} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{body}</p>

      {offerSample ? (
        <form action={loadSampleData} className={styles.actions}>
          <Button type="submit">Load sample data instead</Button>
        </form>
      ) : null}

      <p className={styles.note}>
        Use <b>Connect</b> at the top of the page for a real bank. E-PON only ever reads — it
        cannot move money.
      </p>
    </div>
  );
}
