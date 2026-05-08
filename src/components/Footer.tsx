import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx"];

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--bg)",
        padding: "40px 24px 24px",
      }}
    >
      <div className="mx-auto max-w-[1200px] grid grid-cols-2 sm:grid-cols-4 gap-8">
        {/* Categories */}
        <div>
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: 12,
            }}
          >
            Categories
          </h3>
          <div className="flex flex-col gap-1.5">
            {CATEGORIES.filter((c) => c.key !== "Other").map((cat) => (
              <Link
                key={cat.key}
                href={`/events?category=${encodeURIComponent(cat.key)}`}
                className="transition-colors hover:opacity-80"
                style={{ fontSize: 13, color: "var(--text-secondary)" }}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Boroughs */}
        <div>
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: 12,
            }}
          >
            Boroughs
          </h3>
          <div className="flex flex-col gap-1.5">
            {BOROUGHS.map((b) => (
              <Link
                key={b}
                href={`/events?borough=${encodeURIComponent(b)}`}
                className="transition-colors hover:opacity-80"
                style={{ fontSize: 13, color: "var(--text-secondary)" }}
              >
                {b}
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: 12,
            }}
          >
            Explore
          </h3>
          <div className="flex flex-col gap-1.5">
            <Link href="/events" className="transition-colors hover:opacity-80" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              All Events
            </Link>
            <Link href="/happy-hours" className="transition-colors hover:opacity-80" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Happy Hours
            </Link>
            <Link href="/subscribe" className="transition-colors hover:opacity-80" style={{ fontSize: 13, color: "var(--gold)" }}>
              Subscribe
            </Link>
          </div>
        </div>

        {/* About */}
        <div>
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
              marginBottom: 12,
            }}
          >
            NYC Insider List
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Curated events across rooftops, Broadway, concerts, museums, and more. Updated weekly.
          </p>
        </div>
      </div>

      <div
        className="mt-8 pt-4 text-center"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11 }}
      >
        &copy; {new Date().getFullYear()} NYC Insider List
      </div>
    </footer>
  );
}
