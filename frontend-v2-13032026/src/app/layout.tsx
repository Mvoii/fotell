import type { Metadata } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";

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
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
