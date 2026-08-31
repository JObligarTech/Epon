"use client";

/**
 * The last resort: an error in the root layout itself, before the app's own
 * boundary exists. It replaces <html>, so it cannot use the design tokens —
 * the stylesheet it would need is part of what failed. Deliberately plain, and
 * styled inline so it renders no matter what.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#edeeea",
          color: "#0e1512",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "44ch" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.025em" }}>
            E-PON could not start
          </h1>
          <p style={{ margin: "10px 0 20px", lineHeight: 1.55, color: "#4a544e" }}>
            Something failed before the page could load. Reloading usually clears it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "11px 18px",
              border: 0,
              borderRadius: 12,
              background: "#0f4d3a",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p style={{ marginTop: 16, fontSize: 12, color: "#626c65" }}>
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
