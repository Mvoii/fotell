import type { Metadata } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";

/**
 * Inter — industry-standard body font for high-density data UIs.
 * Large x-height keeps small labels and percentages legible on dark backgrounds.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Sora — geometric proportions that feel modern and premium.
 * Used for headings, large price displays, and the brand wordmark.
 */
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

/**
 * JetBrains Mono — keeps numbers perfectly aligned in tickers,
 * order books, probability percentages, and financial tables.
 */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FoTell — Prediction Markets",
  description: "Trade on the outcomes of real-world events with FoTell, Kenya's premier prediction market platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // No class set here — the FOWT script below applies it before React hydrates
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Flash-of-wrong-theme prevention script.
          Runs synchronously before the first paint to apply the stored theme.
          Default = "light" when no preference is saved.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('fotell:theme');
                  document.documentElement.classList.add(t === 'dark' ? 'dark' : 'light');
                } catch(e) {
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <QueryProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
