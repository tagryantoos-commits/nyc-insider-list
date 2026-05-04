"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, X, Menu } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Navbar({
  searchQuery,
  onSearchChange,
  showSearchBar = false,
}: {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  showSearchBar?: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isEventsPage = pathname === "/events";

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        height: 52,
        background: "var(--bg-nav)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center gap-4 px-4">
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0"
          style={{
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
          }}
        >
          NYC INSIDER LIST
        </Link>

        {/* Nav links - desktop */}
        <div className="hidden sm:flex items-center gap-1 ml-6">
          <Link
            href="/events"
            className="px-3 py-1.5 transition-colors"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: isEventsPage ? "#fff" : "var(--text-secondary)",
              borderBottom: isEventsPage ? "2px solid var(--gold)" : "2px solid transparent",
            }}
          >
            Events
          </Link>
          <span
            className="px-3 py-1.5 cursor-default"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-muted)",
            }}
          >
            Happy Hours
          </span>
        </div>

        <div className="flex-1" />

        {/* Inline search bar for /events page */}
        {showSearchBar && onSearchChange && (
          <div className="hidden sm:block relative w-full max-w-[320px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)", width: 14, height: 14 }}
            />
            <input
              type="text"
              value={searchQuery ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events..."
              className="w-full rounded-lg border outline-none transition focus:border-[rgba(255,255,255,0.15)]"
              style={{
                height: 34,
                paddingLeft: 34,
                paddingRight: 32,
                fontSize: 13,
                background: "var(--bg-input)",
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
        )}

        {/* Search toggle for homepage */}
        {!showSearchBar && (
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="hidden sm:flex items-center justify-center rounded-md p-1.5 transition hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Search"
          >
            <Search style={{ width: 18, height: 18 }} />
          </button>
        )}

        {/* Subscribe */}
        <Link
          href="/subscribe"
          className="hidden sm:inline-block transition-colors hover:opacity-80"
          style={{
            color: "var(--gold)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Subscribe
        </Link>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-1.5"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Menu"
        >
          {mobileMenuOpen ? (
            <X style={{ width: 20, height: 20 }} />
          ) : (
            <Menu style={{ width: 20, height: 20 }} />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="sm:hidden border-t"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border)",
            padding: "12px 16px",
          }}
        >
          <div className="flex flex-col gap-3">
            <Link
              href="/events"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: "var(--text)", fontSize: 14, fontWeight: 500 }}
            >
              Events
            </Link>
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
              Happy Hours
            </span>
            <Link
              href="/subscribe"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: "var(--gold)", fontSize: 14, fontWeight: 600 }}
            >
              Subscribe $2.99/mo
            </Link>
          </div>
        </div>
      )}

      {/* Search overlay for homepage (desktop) */}
      {searchOpen && !showSearchBar && (
        <div
          className="hidden sm:block border-b"
          style={{
            background: "var(--bg)",
            borderColor: "var(--border)",
            padding: "12px 16px",
          }}
        >
          <div className="mx-auto max-w-[480px] relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)", width: 14, height: 14 }}
            />
            <input
              type="text"
              autoFocus
              placeholder="Search events, venues, neighborhoods..."
              className="w-full rounded-lg border outline-none"
              style={{
                height: 36,
                paddingLeft: 36,
                paddingRight: 12,
                fontSize: 13,
                background: "var(--bg-input)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  window.location.href = `/events?q=${encodeURIComponent(e.currentTarget.value.trim())}`;
                }
                if (e.key === "Escape") setSearchOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </nav>
  );
}
