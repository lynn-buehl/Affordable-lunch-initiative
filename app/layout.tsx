import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { resolveTheme } from "@/lib/theme/resolve";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const serif = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ALI",
  description: "Shared shopping and finance tracker for the group",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mode, accent } = await resolveTheme();

  return (
    <html
      lang="en"
      data-mode={mode}
      data-accent={accent}
      className={`${sans.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
