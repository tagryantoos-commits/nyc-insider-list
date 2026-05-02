import type { Metadata } from "next";
import { Outfit, Fraunces } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NYC Insider List — What's Happening in New York",
  description:
    "Curated events across rooftops, Broadway, concerts, museums, and more. Updated weekly. Subscribe for $2.99/mo to sync to your Google Calendar.",
  openGraph: {
    title: "NYC Insider List",
    description: "Curated NYC events. Rooftops, Broadway, concerts, museums, and more.",
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
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
