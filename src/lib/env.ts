/**
 * Environment access, read lazily and validated at the point of use.
 *
 * Deliberately not validated at module load: this deploys to Vercel before the
 * variables are set, and a top-level throw would fail the build rather than
 * the one feature that needs them. A missing variable should break the thing
 * that needs it, with a message saying which variable and where to set it —
 * not the whole site.
 */

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(
      `${name} is not set. Add it to .env.local for local development, and to ` +
        `the project's Environment Variables in Vercel for preview and production. ` +
        `See .env.example.`,
    );
    this.name = "MissingEnvError";
  }
}

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") throw new MissingEnvError(name);
  return value;
}

/**
 * Safe to reach the browser. The publishable key is designed to be public —
 * what actually protects data is row level security on every table, not the
 * secrecy of this key.
 */
export function supabasePublicEnv(): { url: string; anonKey: string } {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

/**
 * Bypasses row level security entirely, so it must never be imported into
 * anything that can reach the browser. Reserved for webhook handlers, which
 * arrive with no user session to act on behalf of.
 */
export function supabaseServiceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("The service role key must never be read in the browser.");
  }
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Whether Supabase is configured, without throwing — for graceful fallbacks. */
export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
