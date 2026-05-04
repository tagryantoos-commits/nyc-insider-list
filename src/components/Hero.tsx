"use client";

export default function Hero({ eventCount }: { eventCount: number }) {
  return (
    <section
      className="relative flex flex-col items-center justify-center text-center overflow-hidden"
      style={{
        height: 280,
        background: `
          radial-gradient(ellipse 300px 120px at 20% 80%, rgba(77,159,255,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 200px 100px at 75% 70%, rgba(240,200,64,0.06) 0%, transparent 70%),
          radial-gradient(ellipse 150px 80px at 50% 90%, rgba(192,132,252,0.05) 0%, transparent 70%),
          radial-gradient(ellipse 100px 60px at 30% 75%, rgba(248,113,113,0.04) 0%, transparent 70%),
          radial-gradient(ellipse 120px 60px at 65% 85%, rgba(52,211,153,0.04) 0%, transparent 70%),
          linear-gradient(180deg, #0a0a2e 0%, #141428 40%, #0a0a0f 100%)
        `,
      }}
    >
      {/* Subtle city light dots */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 10% 85%, rgba(255,220,100,0.6), transparent),
            radial-gradient(1px 1px at 15% 82%, rgba(255,220,100,0.4), transparent),
            radial-gradient(1px 1px at 22% 88%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 35% 80%, rgba(255,220,100,0.5), transparent),
            radial-gradient(1px 1px at 42% 86%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 55% 83%, rgba(255,220,100,0.4), transparent),
            radial-gradient(1px 1px at 62% 87%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 70% 81%, rgba(255,220,100,0.5), transparent),
            radial-gradient(1px 1px at 78% 85%, rgba(255,255,255,0.4), transparent),
            radial-gradient(1px 1px at 85% 84%, rgba(255,220,100,0.3), transparent),
            radial-gradient(1px 1px at 90% 88%, rgba(255,255,255,0.3), transparent),
            radial-gradient(2px 2px at 25% 78%, rgba(255,220,100,0.3), transparent),
            radial-gradient(2px 2px at 50% 76%, rgba(255,220,100,0.2), transparent),
            radial-gradient(2px 2px at 75% 79%, rgba(255,220,100,0.3), transparent)
          `,
        }}
      />

      <h1
        className="relative z-10"
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "-0.01em",
        }}
      >
        New York&apos;s Insider Guide
      </h1>

      <div className="relative z-10 w-full max-w-[480px] mt-5 px-4">
        <input
          type="text"
          placeholder="Search events, venues, neighborhoods..."
          className="w-full rounded-lg border outline-none transition focus:border-[rgba(255,255,255,0.15)]"
          style={{
            height: 40,
            paddingLeft: 16,
            paddingRight: 16,
            fontSize: 14,
            background: "var(--bg-input)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value.trim()) {
              window.location.href = `/events?q=${encodeURIComponent(e.currentTarget.value.trim())}`;
            }
          }}
        />
      </div>

      <p
        className="relative z-10 mt-3"
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--gold)",
          letterSpacing: "0.02em",
        }}
      >
        {eventCount} events &middot; 9 categories &middot; Updated weekly
      </p>
    </section>
  );
}
