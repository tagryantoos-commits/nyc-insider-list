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
