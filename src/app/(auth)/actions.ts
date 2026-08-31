"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "./auth-state";

/**
 * Supabase's own errors are written for developers ("Invalid login
 * credentials", "AuthApiError"). These are the versions a person should read:
 * what went wrong, and what to do about it.
 *
 * Sign-in failure is deliberately vague about which half was wrong — saying
 * "no account with that email" confirms to anyone asking whether a given
 * address is registered here.
 */
function readableError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "That email and password do not match. Check both and try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the link we sent.";
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "There is already an account with that email. Try signing in instead.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return "Something went wrong on our side. Try again in a moment.";
}

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validateEmail(email: string): string | null {
  if (!email) return "Enter your email address.";
  // Deliberately loose. Anything stricter rejects real addresses, and the
  // confirmation email is the real test of whether it works.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That does not look like an email address.";
  return null;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const next = readString(formData, "next");

  const emailError = validateEmail(email);
  if (emailError) return { error: emailError, notice: null };
  if (!password) return { error: "Enter your password.", notice: null };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: readableError(error.message), notice: null };

  // Only ever an in-app path: an open redirect would let a phishing link send
  // people somewhere else entirely after a genuine sign-in.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function createAccount(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email");
  const password = readString(formData, "password");

  const emailError = validateEmail(email);
  if (emailError) return { error: emailError, notice: null };
  if (password.length < 12) {
    return { error: "Use at least 12 characters for your password.", notice: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the sign-up trigger to populate the profile row.
    options: { data: { full_name: fullName || null } },
  });

  if (error) return { error: readableError(error.message), notice: null };

  // With email confirmation on, there is no session yet — sending them to the
  // app would bounce them straight back out.
  if (!data.session) {
    return {
      error: null,
      notice: `Check ${email} for a link to confirm your account.`,
    };
  }

  redirect("/");
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = readString(formData, "email");

  const emailError = validateEmail(email);
  if (emailError) return { error: emailError, notice: null };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email);

  // Always the same answer, sent or not. Reporting "no such account" here
  // turns the form into a way to test which addresses are registered.
  return {
    error: null,
    notice: `If there is an account for ${email}, a reset link is on its way.`,
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
