import Link from "next/link";
import { Fallback } from "@/components/errors/Fallback";
import { ButtonLink, Logo } from "@/components/ui";
import styles from "./root-fallback.module.css";

/**
 * Outside the app shell, so it carries its own brand — this is what an
 * unrecognised URL hits before any layout has been chosen.
 */
export default function NotFound() {
  return (
    <div className={styles.page}>
      <Link href="/" className={styles.brand} aria-label="E-PON home">
        <Logo />
      </Link>
      <Fallback
        icon="search"
        title="We could not find that"
        body="That address does not lead anywhere in E-PON."
      >
        <ButtonLink href="/" variant="primary">
          Back to overview
        </ButtonLink>
      </Fallback>
    </div>
  );
}
