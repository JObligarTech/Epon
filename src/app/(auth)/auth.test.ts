/**
 * @vitest-environment node
 *
 * Server actions and the redirect guard. Node, because these never run in a
 * browser and next/navigation's redirect throws a control-flow signal that is
 * cleaner to assert on outside jsdom.
 */
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
    },
  }),
}));

import { createAccount, requestPasswordReset, signIn } from "./actions";
import { EMPTY_STATE } from "./auth-state";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const redirectedTo = async (run: () => Promise<unknown>): Promise<string | null> => {
  try {
    await run();
    return null;
  } catch (error) {
    const match = /^REDIRECT:(.*)$/.exec((error as Error).message);
    return match ? match[1] : null;
  }
};

describe("signIn", () => {
  it("rejects a malformed email before calling Supabase", async () => {
    const state = await signIn(EMPTY_STATE, form({ email: "not-an-email", password: "x" }));
    expect(state.error).toMatch(/does not look like an email/);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("requires a password", async () => {
    const state = await signIn(EMPTY_STATE, form({ email: "a@b.co", password: "" }));
    expect(state.error).toBe("Enter your password.");
  });

  it("does not reveal whether an email is registered", async () => {
    // Saying "no account with that email" turns the form into a way to test
    // which addresses have accounts here.
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    });
    const state = await signIn(EMPTY_STATE, form({ email: "a@b.co", password: "wrong" }));

    expect(state.error).toBe("That email and password do not match. Check both and try again.");
    expect(state.error).not.toMatch(/no account|not found|unknown/i);
  });

  it("never surfaces a raw Supabase error to the person reading it", async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: { message: "AuthApiError: unexpected_failure at /token" },
    });
    const state = await signIn(EMPTY_STATE, form({ email: "a@b.co", password: "x" }));
    expect(state.error).toBe("Something went wrong on our side. Try again in a moment.");
  });

  it("returns to where the visitor was headed", async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({ error: null });
    const to = await redirectedTo(() =>
      signIn(EMPTY_STATE, form({ email: "a@b.co", password: "x", next: "/transactions" })),
    );
    expect(to).toBe("/transactions");
  });

  it("refuses an off-site redirect", async () => {
    // A phishing link could otherwise carry ?next=//evil.example and land a
    // genuinely signed-in person somewhere else entirely.
    mocks.signInWithPassword.mockResolvedValue({ error: null });

    for (const hostile of ["//evil.example", "https://evil.example", "javascript:alert(1)"]) {
      const to = await redirectedTo(() =>
        signIn(EMPTY_STATE, form({ email: "a@b.co", password: "x", next: hostile })),
      );
      expect(to).toBe("/");
    }
  });
});

describe("createAccount", () => {
  it("requires a password long enough to be worth having", async () => {
    const state = await createAccount(EMPTY_STATE, form({ email: "a@b.co", password: "short" }));
    expect(state.error).toMatch(/at least 12 characters/);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("waits for confirmation instead of sending an unconfirmed user into the app", async () => {
    // With email confirmation on there is no session yet, so redirecting would
    // bounce them straight back to sign-in.
    mocks.signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
    const state = await createAccount(
      EMPTY_STATE,
      form({ email: "a@b.co", password: "correct-horse-battery" }),
    );

    expect(state.notice).toMatch(/Check a@b\.co/);
    expect(state.error).toBeNull();
  });

  it("goes straight in when confirmation is off and a session came back", async () => {
    mocks.signUp.mockResolvedValueOnce({ data: { session: { access_token: "x" } }, error: null });
    const to = await redirectedTo(() =>
      createAccount(EMPTY_STATE, form({ email: "a@b.co", password: "correct-horse-battery" })),
    );
    expect(to).toBe("/");
  });

  it("passes the name through for the profile trigger to read", async () => {
    mocks.signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
    await createAccount(
      EMPTY_STATE,
      form({ fullName: "Jordan Reyes", email: "a@b.co", password: "correct-horse-battery" }),
    );

    expect(mocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { data: { full_name: "Jordan Reyes" } } }),
    );
  });
});

describe("requestPasswordReset", () => {
  it("answers the same whether or not the account exists", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });

    const real = await requestPasswordReset(EMPTY_STATE, form({ email: "real@b.co" }));
    const fake = await requestPasswordReset(EMPTY_STATE, form({ email: "fake@b.co" }));

    expect(real.notice).toBe("If there is an account for real@b.co, a reset link is on its way.");
    expect(fake.notice).toBe("If there is an account for fake@b.co, a reset link is on its way.");
    expect(real.error).toBeNull();
    expect(fake.error).toBeNull();
  });

  it("still validates the address before sending anything", async () => {
    const state = await requestPasswordReset(EMPTY_STATE, form({ email: "nope" }));
    expect(state.error).toMatch(/does not look like an email/);
  });
});
