"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui";
import { signIn } from "../actions";
import { EMPTY_STATE } from "../auth-state";
import styles from "@/components/auth/AuthForm.module.css";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const [state, formAction] = useActionState(signIn, EMPTY_STATE);
  const next = useSearchParams().get("next") ?? "";

  return (
    <>
      <h2 className={styles.heading}>Welcome back</h2>
      <p className={styles.lede}>Sign in to pick up where you left off.</p>

      <AuthMessage error={state.error} notice={state.notice} />

      <form action={formAction} noValidate>
        <input type="hidden" name="next" value={next} />

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
            <Link href="/reset-password" className={styles.link}>
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>

      <p className={styles.swap}>
        New here?{" "}
        <Link href="/create-account" className={styles.link}>
          Create an account
        </Link>
      </p>
    </>
  );
}
