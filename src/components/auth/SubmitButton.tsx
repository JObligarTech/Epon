"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import styles from "./AuthForm.module.css";

/**
 * Disabled while submitting, so a slow network cannot turn one sign-up into
 * three. useFormStatus reads the enclosing form's state, so no wiring is
 * needed between this and the action.
 */
export function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" block className={styles.submit} disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
