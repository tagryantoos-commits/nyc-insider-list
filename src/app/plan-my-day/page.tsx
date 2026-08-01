import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlanForm from "./plan-form";

export const metadata: Metadata = {
  title: "Plan My Day — NYC Insider List",
  description:
    "Tell us your mood and how long you've got. We'll build you a time-blocked NYC itinerary from tonight's real events, happy hours, and classics.",
};

export default function PlanMyDayPage() {
  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-[640px] px-4 py-10 min-h-[70vh]">
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>
          Plan my day
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
          Pick a mood, tell us how long you&apos;ve got, and we&apos;ll build your day
          from real events happening in NYC right now.
        </p>
        <Suspense>
          <PlanForm />
        </Suspense>
      </div>
      <Footer />
    </>
  );
}
