import type { Metadata, Viewport } from "next";
import { DM_Mono, Schibsted_Grotesk } from "next/font/google";
import { ThemeScript } from "@/components/theme/ThemeScript";
import "./globals.css";

const sans = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// The instrument voice: every balance, amount, mask and the wordmark itself.
const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "E-PON",
  description: "Every account, one clear view.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EDEEEA" },
    { media: "(prefers-color-scheme: dark)", color: "#0C110F" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // ThemeScript stamps data-theme on this element before React hydrates, so
    // the server HTML and the live DOM differ here by design. Scoped to <html>
    // itself, so a genuine mismatch anywhere inside still reports.
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
