"use client";

import Link from "next/link";
import { Search, Sun, Moon, X } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function Navbar({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const { theme, toggle } = useTheme();

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        height: 56,
        background: "var(--bg-nav)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center gap-4 px-4 lg:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0"
          style={{
            color: "var(--text)",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          NYC INSIDER LIST
        </Link>

        {/* Search */}
        <div className="relative mx-auto w-full max-w-[360px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)", width: 14, height: 14 }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events, venues, neighborhoods..."
            className="w-full rounded-lg border outline-none transition focus:ring-1 focus:ring-blue-500/30"
            style={{
              height: 36,
              paddingLeft: 36,
              paddingRight: 32,
              fontSize: 13,
              background: "var(--bg)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggle}
            className="rounded-md p-1.5 transition hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon style={{ width: 20, height: 20 }} />
            ) : (
              <Sun style={{ width: 20, height: 20 }} />
            )}
          </button>
          <Link
            href="/subscribe"
            className="hidden sm:inline-block transition-colors hover:underline"
            style={{
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Subscribe
          </Link>
        </div>
      </div>
    </nav>
  );
}
