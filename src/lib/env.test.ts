/**
 * @vitest-environment node
 *
 * These assertions are about server-side environment access, and one of them
 * is specifically that the service role key refuses to be read where a window
 * exists. Under jsdom a window always exists, so that guard would fire on
 * every test here and prove nothing.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  hasSupabaseConfig,
  MissingEnvError,
  supabasePublicEnv,
  supabaseServiceRoleKey,
} from "./env";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("supabasePublicEnv", () => {
  it("returns the configured values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "publishable-key";

    expect(supabasePublicEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "publishable-key",
    });
  });

  it("names the missing variable and where to set it", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "publishable-key";

    expect(() => supabasePublicEnv()).toThrow(MissingEnvError);
    expect(() => supabasePublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => supabasePublicEnv()).toThrow(/Vercel/);
  });

  it("treats blank as missing, not as configured", () => {
    // An empty value in a dashboard is a much more common mistake than an
    // absent one, and it fails far less obviously.
    process.env.NEXT_PUBLIC_SUPABASE_URL = "   ";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "publishable-key";
    expect(() => supabasePublicEnv()).toThrow(MissingEnvError);
  });

  it("throws only when read, so importing it cannot break a build", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // Reaching this line at all is the assertion: the module imported fine
    // with nothing configured.
    expect(() => supabasePublicEnv()).toThrow();
  });
});

describe("hasSupabaseConfig", () => {
  it("reports configuration without throwing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(hasSupabaseConfig()).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "publishable-key";
    expect(hasSupabaseConfig()).toBe(true);
  });
});

describe("supabaseServiceRoleKey", () => {
  it("returns the key on the server", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret";
    expect(supabaseServiceRoleKey()).toBe("secret");
  });

  it("refuses to be read in a browser", () => {
    // This key bypasses row level security, so reading it client-side would
    // hand every user everyone else's data.
    const globalWithWindow = globalThis as { window?: unknown };
    const had = "window" in globalWithWindow;
    globalWithWindow.window = {};

    try {
      expect(() => supabaseServiceRoleKey()).toThrow(/never be read in the browser/);
    } finally {
      if (!had) delete globalWithWindow.window;
    }
  });
});
