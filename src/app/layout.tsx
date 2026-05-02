import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NYC Insider List — What's Happening in New York",
  description:
    "Curated events across rooftops, Broadway, concerts, museums, and more. Updated weekly.",
  openGraph: {
    title: "NYC Insider List",
    description: "Curated NYC events. Updated weekly.",
    url: "https://nycinsiderlist.com",
    siteName: "NYC Insider List",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)] antialiased">
        {children}
      </body>
    </html>
  );
}
