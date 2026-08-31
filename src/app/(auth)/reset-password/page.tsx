"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui";
import { requestPasswordReset } from "../actions";
import { EMPTY_STATE } from "../auth-state";
import styles from "@/components/auth/AuthForm.module.css";

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordReset, EMPTY_STATE);

  return (
    <>
      <h2 className={styles.heading}>Reset your password</h2>
      <p className={styles.lede}>We&rsquo;ll email you a link to choose a new one.</p>

      <AuthMessage error={state.error} notice={state.notice} />

      <form action={formAction} noValidate>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            required
          />
        </div>

        <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
      </form>

      <p className={styles.swap}>
        <Link href="/sign-in" className={styles.link}>
          Back to sign in
        </Link>
      </p>
    </>
  );
}
