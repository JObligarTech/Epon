/**
 * The real `server-only` package throws on import unless the bundler set React's
 * server condition. That guard is exactly what we want in the app — it stops a
 * server module being pulled into client code — but under Vitest it just makes
 * server modules untestable. Aliased to this no-op instead.
 */
export {};
