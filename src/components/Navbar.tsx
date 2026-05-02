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
    <nav className="sticky top-0 z-50 border-b bg-[var(--bg-nav)]" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-4 py-2.5 lg:px-6">
        <Link href="/" className="shrink-0 text-[15px] font-bold tracking-tight" style={{ color: "var(--text)" }}>
          NYC INSIDER LIST
        </Link>

        <div className="relative flex-1 max-w-[500px] mx-auto">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events, venues..."
            className="w-full rounded-lg border py-2 pl-9 pr-8 text-[13px] outline-none transition focus:ring-1 focus:ring-blue-500/30"
            style={{
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
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggle}
            className="rounded-md p-1.5 transition hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <Link
            href="/subscribe"
            className="hidden sm:inline-block rounded-md bg-[#111827] px-3.5 py-1.5 text-[12px] font-medium text-white dark:bg-white dark:text-[#111827]"
          >
            Subscribe $2.99/mo
          </Link>
        </div>
      </div>
    </nav>
  );
}
