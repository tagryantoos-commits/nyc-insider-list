import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SpontaneousDeck from "./spontaneous-deck";

export const metadata: Metadata = {
  title: "I'm Feeling Spontaneous — NYC Insider List",
  description:
    "One tap, one great thing to do in NYC in the next few hours. No planning, no scrolling.",
};

export default function SpontaneousPage() {
  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-[560px] px-4 py-10 min-h-[70vh]">
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>
          I&apos;m feeling spontaneous
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
          One thing worth leaving the house for, happening in the next few hours.
          Don&apos;t like it? Hit the dice.
        </p>
        <SpontaneousDeck />
      </div>
      <Footer />
    </>
  );
}
