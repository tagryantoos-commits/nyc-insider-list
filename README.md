# NYC Insider List

Paid subscription events discovery site for NYC. Browse events for free, pay $2.99/mo to get them synced to your Google Calendar.

## Architecture

```
Browser --> Next.js (Vercel) --> Supabase (events DB)
                |                       ^
                +--> Stripe (payments)   |
                |                       |
Scraper --> events_raw.json --> sync script --> Supabase
                                        |
n8n polls calendar_actions --> Google Calendar API (grant/revoke ACL)
```

## Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS
- **Database**: Supabase (Postgres + RLS)
- **Payments**: Stripe Checkout + Webhooks
- **Hosting**: Vercel
- **Calendar**: Google Calendar API (ACL grants via n8n)

## Local Development

```bash
npm install
cp .env.local.example .env.local
# Fill in env vars
npm run dev
```

## Data Pipeline

```bash
# Upload scraped events to Supabase
python scripts/upload_events.py ../nyc-events-calendar/data/events_raw.json

# Or use the Node.js version
npx tsx scripts/sync_events.ts ../nyc-events-calendar/data/events_raw.json
```

## Supabase Setup

1. Create a project at https://supabase.com
2. Run `supabase/schema.sql` in the SQL Editor
3. Copy the URL, anon key, and service role key to `.env.local`

## Stripe Setup

1. Create a product "NYC Insider List" with a $2.99/mo recurring price
2. Copy the price ID to `STRIPE_PRICE_ID`
3. Set up webhook endpoint: `https://nycinsiderlist.com/api/webhooks/stripe`
4. Listen for: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`, `customer.subscription.updated`
5. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all env vars from `.env.local`
4. Deploy

## DNS (Namecheap)

Add these records:
- `A` record: `@` -> `76.76.21.21`
- `CNAME` record: `www` -> `cname.vercel-dns.com`
- Vercel will provide a TXT record for domain verification

## Featured Events

To mark events as featured, update the `is_featured` column in Supabase:

```sql
UPDATE events SET is_featured = true WHERE title ILIKE '%Gov Ball%';
```

## Session Log — 2026-05-12

This was a massive multi-day build session covering the full NYC Insider List product from inception to production.

### NYC Events Calendar (~/nyc-events-calendar)
- Built scraper pipeline for 11 NYC event sources (TimeOut, Eventbrite, NYC Parks, Broadway, MLB API, MSG API, Barclays, Songkick, SummerStage, museums, festivals)
- Created 9 per-category Google Calendars (Rooftop, Broadway, Sports, Concerts, Museums, Festivals, Free Events, Film, Other) under Ryan@TheAssumableGuy.com
- Added 147 curated rooftop events (Pier 17, Marquee Skydeck, 230 Fifth, Azure Sundays, The DL, Starchild, Hotel Chantelle, HB, Highbar)
- Built calendar sharing, cleanup, and migration scripts
- Migrated all calendars from personal Gmail to work Workspace account

### NYC Insider List Website (~/nyc-insider-list)
- Built full Next.js 16 site deployed on Vercel at nycinsiderlist.com
- Supabase backend (events, subscribers, calendar_actions, happy_hours tables)
- Stripe Checkout integration ($2.99/mo subscription)
- Multiple frontend redesigns: dark editorial theme, sidebar layout, date grouping, light/dark toggle
- Event detail pages at /events/[id] with SEO metadata
- Happy hours page with 2,565 NYC venues from Google Places API
- Homepage with category carousels, tonight/weekend sections, search

### Scrapers (weekly cron, 9 steps)
- Rooftop events (Pier 17 + Edge via Playwright, 230 Fifth, Eventbrite)
- Kid-friendly events (Eventbrite, NYC Parks, museums)
- Museum events (12 museums + 12 recurring free nights)
- Comedy events (The Stand, Eventbrite) + NYC - Comedy Google Calendar
- Broadway shows (broadway.org, refreshed monthly)
- Free events (recurring museum free nights + Eventbrite free)
- Sports: all 9 NYC teams (Yankees, Mets, Knicks, Nets, Rangers, Islanders, Liberty, NYCFC, Red Bulls) via MLB API, ESPN API, NHL API
- Concerts/Festivals (Songkick, SummerStage, Eventbrite)
- Happy hour website enricher
- Windows Task Scheduler: Sundays 11 PM ET

### n8n Subscription Workflows
- New Subscriber: Stripe webhook -> Google Calendar ACL grant (12 calendars) + welcome email
- Cancellation: Stripe webhook -> revoke ACL + goodbye email
- End-to-end tested: 32/32 passed (grant + revoke + email)

### Tests
- Sports scraper tests: 60/60 passed across 9 teams
- Full subscription flow E2E test: 7/7 passed

### Final Database Stats
- 1,000+ events across 11 categories
- 2,565 happy hour venues
- 12 Google Calendars (Rooftop, Broadway, Sports, Concerts, Museums, Festivals, Free Events, Film, Other, Kid-Friendly, Comedy, + original NYC Events migrated)

## Session Log — 2026-05-03 to 2026-05-12

### Frontend redesign (3 iterations)
- **v1**: Clean database tool with light/dark toggle, sidebar + 3-column grid, Inter font
- **v2**: Dark magazine layout inspired by NYC.com -- hero with CSS city skyline gradient, horizontal category carousels (Rooftop, Broadway, Concerts, Sports, etc.), gold accent pricing, dark premium aesthetic
- **v3**: Entertainment magazine with "Happening TONIGHT" and "This WEEKEND" cross-category carousels at top, in-place hero search, carousel fade edges + visible arrows

### Borough filtering
- Added `borough` column to events table via Supabase migration
- Classified all 794 events (Manhattan: 602, Bronx: 65, Brooklyn: 62, Queens: 62, Staten Island: 3) using venue/neighborhood keyword matching
- Borough filter in sidebar (desktop) + horizontal tabs (mobile)
- Updated API to support `?borough=` query parameter
- Updated scraper pipeline (`upload_events.py`, `rooftop_events.py`) to auto-classify on insert

### 12 UX improvements
1. "Happening TONIGHT" / "This WEEKEND" sections on homepage
2. Inline event detail expansion (click card to see description + Get Tickets)
3. "LIVE" indicator with pulsing red dot on in-progress events
4. Neighborhood filter (dropdown within selected borough)
5. Carousel gradient fade edges + always-visible arrow buttons
6. Save/bookmark events to localStorage (heart icon)
7. Share button (copies event URL to clipboard with "Copied!" toast)
8. Homepage search filters carousels in-place (no redirect)
9. "X added this week" freshness counter in hero
10. Date chip quick filters (Today, Tomorrow, Sat-Wed) + "All Events" reset
11. Contextual empty state messages per category/filter
12. Structured footer with Categories, Boroughs, Explore links

### Paywall / conversion features
- **Soft paywall**: Events 7+ days out blur venue/time/price, show gold lock icon
- **Calendar preview**: Visual Google Calendar mockup populated with real events, color-coded by category
- **Subscribe modal**: Inline overlay with value props, calendar preview, email input for Stripe checkout (no page redirect)
- **Insider Picks**: Gold star "PICK" badge on featured events
- **Subscriber count**: Real count from Supabase shown as "Join X+ subscribers" social proof
- **7-day free trial** messaging throughout

### Test suite
- **176 tests across 3 suites, all passing**
- Jest + React Testing Library + ts-jest + jsdom
- Core tests (57): rendering, props, interactions for all components
- Edge cases (60): null fields, sold-out detection, expand/collapse, clipboard API, form submission errors, paywall boundaries, sidebar state
- Edge cases 2 (59): isHappeningNow time parsing (AM/PM/noon/midnight), Navbar states, MobileFilters interactions, hover styles, metadata formatting, price priority chain, CategoryCarousel guards
