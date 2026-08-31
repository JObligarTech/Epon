"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui";
import { createAccount } from "../actions";
import { EMPTY_STATE } from "../auth-state";
import styles from "@/components/auth/AuthForm.module.css";

export default function CreateAccountPage() {
  const [state, formAction] = useActionState(createAccount, EMPTY_STATE);

  return (
    <>
      <h2 className={styles.heading}>Create your account</h2>
      <p className={styles.lede}>It takes about a minute. You can connect banks after.</p>

      <AuthMessage error={state.error} notice={state.notice} />

      <form action={formAction} noValidate>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="fullName">
              Full name
            </label>
          </div>
          <Input id="fullName" name="fullName" autoComplete="name" placeholder="Jordan Reyes" />
        </div>

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

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 12 characters"
            minLength={12}
            required
            aria-describedby="password-hint"
          />
          <p id="password-hint" className={styles.lede} style={{ margin: "7px 0 0", fontSize: 12 }}>
            At least 12 characters. Length matters more than symbols.
          </p>
        </div>

        <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
      </form>

      <p className={styles.swap}>
        Already have an account?{" "}
        <Link href="/sign-in" className={styles.link}>
          Sign in
        </Link>
      </p>
    </>
  );
}
