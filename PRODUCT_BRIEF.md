# NYC Insider List — Master Product Brief for Claude Code

**Read this entire document before writing code. This is the north star for the product. You have autonomy to make decisions, propose better approaches, and implement ideas not listed here — as long as they serve the core mission.**

---

## The Mission

Build the single most comprehensive, useful, and delightful guide to what's happening in New York City — good enough that people happily pay $2.99/month for it.

**The bar we're clearing:** A New Yorker or visitor opens this app instead of texting a friend "what should we do tonight?" They find something great in under 30 seconds. They do that again next weekend. They never cancel.

---

## Why Someone Pays $2.99/Month

$2.99 is impulse pricing, but people still need a reason. Here are the five, in order of persuasive power:

### 1. It pays for itself immediately
This is the strongest argument and should be central to the entire product. If the app points someone toward a free concert instead of a $60 show, or a $6 happy hour cocktail instead of a $19 one, it has paid for itself twelve times over in one night. **Every design decision should reinforce this.** Lead with free events. Lead with deals. Make the savings visible and explicit.

### 2. Comprehensiveness — everything, in one place
Right now a New Yorker checks Time Out, then Eventbrite, then Instagram, then Resident Advisor, then their friend's group chat. We replace all of it. Nobody else has events + happy hours + free stuff + kids + rooftops + museums in one searchable place.

### 3. Curation — the good stuff, not everything
Comprehensiveness without curation is noise. We need editor's picks, quality scoring, and a clear signal of what's actually worth going to. A 2,000-item list nobody can navigate is worthless.

### 4. Automatic calendar sync
The calendar subscriptions are genuinely differentiated. Nobody else pushes curated NYC events directly into your Google Calendar, organized by category, that you can toggle on and off. This is sticky — once it's in your calendar, canceling means losing something you see every day.

### 5. Discovery — things you'd never find otherwise
The obsessively-scraped long tail. The Tuesday jazz night at a bar in Bed-Stuy. The free museum evening nobody advertises. The rooftop day party. This is what makes someone say "how did you know about that?"

---

## Part One: Find Every Event in NYC

The current database has ~670 events. **The target is 5,000+ active events at any given time.** NYC has that many and more. Here's where to find them.

### Category: Music & Nightlife

| Source | URL | Notes |
|---|---|---|
| Songkick | `https://www.songkick.com/metro-areas/7644-us-new-york-nyc` | Thousands of concerts, most comprehensive |
| Bandsintown | `https://www.bandsintown.com/c/new-york-ny` | Overlaps Songkick but catches different shows |
| Resident Advisor | `https://ra.co/events/us/newyork` | Electronic/club events — nobody else has this depth |
| Dice.fm | `https://dice.fm/browse/new-york` | Indie venues, sold-out alerts |
| Bowery Presents | `https://www.bowerypresents.com/` | Bowery Ballroom, Mercury Lounge, Music Hall of Williamsburg, Terminal 5 |
| Brooklyn Steel / Brooklyn Made | Individual venue calendars | Major Brooklyn venues |
| Blue Note / Village Vanguard / Birdland / Smalls | Individual venue calendars | Jazz — high-value niche |
| Madison Square Garden | `https://www.msg.com/calendar` | Arena shows |
| Barclays Center | `https://www.barclayscenter.com/events` | Arena shows |
| Radio City / Beacon / Apollo | Individual venue calendars | Iconic venues |
| Elsewhere / Public Records / Nowadays / Good Room | Venue calendars | Brooklyn nightlife |
| SummerStage | `https://cityparksfoundation.org/summerstage/` | Free + benefit concerts, huge summer draw |
| Lincoln Center | `https://www.lincolncenter.org/calendar` | Classical, opera, ballet, Summer for the City (free) |
| Carnegie Hall | `https://www.carnegiehall.org/Calendar` | Classical + Citywide free concerts |
| BAM | `https://www.bam.org/calendar` | Brooklyn Academy of Music |

### Category: Theater & Performing Arts

| Source | URL | Notes |
|---|---|---|
| Playbill | `https://playbill.com/productions` | Broadway + Off-Broadway |
| Broadway.com | `https://www.broadway.com/shows/` | Current shows, pricing |
| TodayTix | `https://www.todaytix.com/nyc/shows` | Discounted tickets, rush deals |
| Off-Broadway.com | Off-Broadway listings | Underserved category |
| The Public Theater | `https://publictheater.org/` | Shakespeare in the Park (free) |
| Signature / Atlantic / Playwrights Horizons / Vineyard | Venue calendars | Off-Broadway theaters |
| St. Ann's Warehouse / The Shed / Park Avenue Armory | Venue calendars | Experimental performance |
| New York City Ballet / ABT | Company calendars | Dance |
| Metropolitan Opera | `https://www.metopera.org/season/` | Opera |

### Category: Comedy

| Source | URL | Notes |
|---|---|---|
| Comedy Cellar | `https://www.comedycellar.com/line-up/` | Legendary, nightly shows |
| Gotham Comedy Club | Venue calendar | |
| Caroline's / Stand Up NY / New York Comedy Club | Venue calendars | |
| UCB Theatre | `https://ucbtheatre.com/` | Improv/sketch, cheap tickets |
| The Bell House / Union Hall | Venue calendars | Brooklyn comedy + podcasts |
| Littlefield | Venue calendar | Brooklyn comedy |

**Note:** Comedy is currently NOT a category on the site. Add it. It's a huge, underserved NYC category with nightly shows at accessible prices.

### Category: Sports

| Source | Notes |
|---|---|
| MLB Stats API (Yankees, Mets) | Use the API, not HTML scraping |
| NBA API (Knicks, Nets) | |
| NHL API (Rangers, Islanders, Devils) | |
| NYCFC / NY Red Bulls (MLS) | |
| NY Liberty (WNBA) | Growing fast, underserved |
| US Open / other tennis | Seasonal |
| NYC Marathon, Brooklyn Half, other road races | Participatory events |
| College sports (St. John's, Columbia, Fordham) | |
| Belmont Stakes / horse racing | |
| FIFA World Cup 2026 events | Major this summer |

### Category: Food & Drink

| Source | Notes |
|---|---|
| Eater NY event listings | Restaurant openings, pop-ups, dinners |
| Smorgasburg | `https://www.smorgasburg.com/` — weekend food markets |
| NYC Wine & Food Festival | Annual |
| Restaurant Week (Winter/Summer) | NYC & Company |
| Night markets, food festivals, street fairs | Seasonal |
| Brewery/distillery events | Brooklyn Brewery, Other Half, etc. |

### Category: Free Events

This is the highest-value category for the "pays for itself" argument. Scrape aggressively.

| Source | URL | Notes |
|---|---|---|
| NYC Parks | `https://www.nycgovparks.org/events` | Thousands of free events |
| NYC for Free | `https://www.nycforfree.co/events` | Curated free listings |
| Bryant Park | `https://bryantpark.org/` | Films, fitness, games, all free |
| Central Park Conservancy | `https://www.centralparknyc.org/events` | |
| Prospect Park Alliance | `https://www.prospectpark.org/events-activities/` | |
| Brooklyn Bridge Park | Venue calendar | Free movies, fitness |
| Hudson River Park | Venue calendar | Free programming |
| Governors Island | `https://www.govisland.com/things-to-do/events` | Seasonal, mostly free |
| NYPL + Brooklyn Public Library | Event calendars | Massive free programming |
| Free museum nights | See museum brief | |
| Open Streets / street fairs | NYC DOT | |

### Category: Museums, Galleries & Art

Covered in detail in the museum brief. Also add:
- Chelsea gallery openings (`https://www.artforum.com/` guide, `https://www.artsy.net/shows`)
- Lower East Side gallery walks
- Bushwick Open Studios
- Armory Show, Frieze NY, and other art fairs

### Category: Film

| Source | Notes |
|---|---|
| Film Forum, IFC Center, Angelika, Metrograph, Nitehawk, Alamo Drafthouse | Independent cinema calendars |
| Museum of the Moving Image | Screenings |
| Lincoln Center Film | New York Film Festival |
| Tribeca Festival | Annual |
| Rooftop Cinema Club, Bryant Park films, outdoor screenings | Seasonal |
| Anthology Film Archives, Japan Society, French Institute | Specialty programming |

### Category: Markets, Fairs & Seasonal

- Union Square Greenmarket and other greenmarkets
- Brooklyn Flea, Artists & Fleas
- Holiday markets (Bryant Park, Union Square, Columbus Circle)
- Street fairs (all five boroughs)
- Craft fairs, vintage markets, record fairs

### Category: Wellness & Fitness

- Free outdoor yoga (Bryant Park, Prospect Park, Hudson River Park)
- Run clubs, group rides
- Meditation events
- ClassPass/Eventbrite fitness events

### Category: Talks, Lectures & Learning

- 92nd Street Y
- The Strand author events
- McNally Jackson, Books Are Magic, other bookstore readings
- The Moth StorySLAMs
- Cooper Union, New School, Columbia public lectures
- Pioneer Works

### Category: Nightlife & Parties

- Rooftop parties (already covered)
- Day parties, boat parties
- Themed parties, Silent Disco
- Drag brunches and shows
- Queer nightlife (this is a significant, underserved NYC scene)

### Aggregators to scrape as a safety net

- Time Out NY, The Infatuation, Secret NYC, DoNYC, Brooklyn Vegan, Oh My Rockness, The Skint (free events), Gothamist, amNY, Untapped Cities, NYC Tourism, Eventbrite (all categories), Meetup, Fever, Dice, Luma

---

## Part Two: The User Experience

### The core UX principle

**Someone should find something they want to do within 30 seconds of opening the app.** Every design decision serves that.

### Answer the four questions people actually have

Most event apps organize by category. That's how the data is structured, not how people think. People arrive with one of four questions:

1. **"What's happening tonight?"** → Time-based, immediate, near me
2. **"What should we do this weekend?"** → Planning mode, browse by interest
3. **"What's free?"** → Budget mode, this is where we win
4. **"Where should we go for drinks/dinner first?"** → Happy hours, near the event

Build entry points for all four on the homepage. Not just a category grid.

### Specific UX requirements

**Homepage should lead with time, not category.**
- "Tonight in NYC" — what's happening in the next 6 hours
- "This Weekend" — Friday through Sunday
- "Free This Week" — the money-saver section
- Then category carousels below

**Location awareness.** Ask for location permission (optional). If granted, show "Near You" with distance. "0.3 mi away" is more compelling than a neighborhood name.

**The 30-second test.** Anyone should be able to go from cold open to "I'm going to that" in 30 seconds. If a flow takes more taps than that, redesign it.

**Search that actually works.** Fuzzy matching, typo tolerance, searching across title, venue, neighborhood, artist, and description. Someone typing "jazz" should get every jazz show, not just events with "jazz" in the title.

**Mobile-first, genuinely.** Most people will use this on a phone while standing on a sidewalk deciding where to go. Thumb-reachable controls, big tap targets, fast load, works on bad LTE.

**Speed matters more than features.** If the homepage takes 3 seconds to load, people bounce. Server-side render, cache aggressively, lazy load below the fold. Target sub-1.5s First Contentful Paint.

---

## Part Three: Features That Justify the Subscription

Some of these are specified. Some are suggestions. **You have the freedom to prioritize, modify, or replace these with better ideas — and to propose features nobody listed.**

### High-confidence features (build these)

**1. Save / Favorites**
Let people heart an event. Saved events go into a "My List" view. This is table stakes and creates return visits. Requires lightweight auth (magic link or Google sign-in).

**2. "Add to Calendar" per event**
One-tap add of an individual event to their personal calendar, separate from the category subscriptions. Generate an .ics download or Google Calendar quick-add link.

**3. Weekly digest email**
Every Thursday morning: "Your weekend in NYC." Personalized by their saved categories and location. This is the single highest-retention feature in this entire document — it brings people back without them opening the app, and it's the thing that makes canceling feel like a loss.

**4. "Tonight" mode**
A dedicated view that only shows things happening in the next 6 hours, sorted by proximity. Include happy hours currently active. This is the killer mobile use case.

**5. Price filtering with real thresholds**
Not just "free only." Let people filter under $25, under $50, etc. Money is the primary constraint for most people most of the time.

**6. Neighborhood + distance filtering**
"Within 1 mile of me" or "in the East Village." Location is the second-biggest constraint after price.

**7. Free events as a first-class citizen**
A permanent "Free" tab in the nav, not buried in a filter. This is the argument for the subscription — make it impossible to miss.

**8. Happy hour + event pairing**
When someone views an event, show 3 nearby happy hours that end before the event starts. "Drinks before the show." This connects the two datasets in a way that's genuinely useful and that nobody else does.

### Medium-confidence features (evaluate and build if they hold up)

**9. Personalized recommendations**
Learn from saves and clicks. "Because you saved indie rock shows..." Doesn't need ML — simple category + venue affinity scoring gets 80% of the value.

**10. Map view**
Toggle any list to a map. Especially valuable for happy hours and for "what's near me tonight."

**11. Sold-out alerts / on-sale reminders**
"Tickets go on sale Friday at 10 AM" with a reminder. High perceived value, low build cost.

**12. Group planning**
Share a shortlist with friends via a link. Let them vote. This is how plans actually get made and it's a viral loop.

**13. "Surprise me"**
A single button that picks something great happening soon. For decision-paralysis moments. Cheap to build, delightful.

**14. Streaks / discovery stats**
"You've been to 12 events this year." Light gamification that reinforces value.

### Ideas worth exploring (your call)

- Text/SMS alerts for tonight's picks
- An "Insider Score" on every event indicating how good it actually is
- Editorial content — short "why this is worth your time" blurbs on top events
- Venue profiles with upcoming events at that venue
- Artist/performer following
- Seasonal guides (Summer in NYC, Holiday NYC)
- Integration with ticket purchasing (affiliate revenue potential)
- A "visiting NYC?" onboarding flow that builds a 3-day itinerary

**If you think of something better than anything on this list, build that instead and tell me why.**

---

## Part Four: Data Quality Standards

More events only helps if the events are real and the data is clean. Enforce these:

1. **No junk.** Scraped website copy, navigation text, and marketing paragraphs are not events. Filter aggressively. Any "event" with a title over 120 characters is junk. Any title containing phrases like "we've compiled," "click here," "use following links" is junk.

2. **No duplicates.** Fuzzy match on title + date + venue at 85% threshold. The same concert appearing four times destroys trust instantly.

3. **No chains, no filler.** For happy hours, non-chain only. For events, real events only.

4. **Every event needs a working link.** If the URL 404s, either fix it or drop the event.

5. **Dates must be real and future.** No events in the past showing as upcoming. Clean up weekly.

6. **Prices should be accurate when shown.** Better to show nothing than a wrong price.

7. **Set `is_featured` deliberately.** Featured means "this is genuinely one of the best things happening." Not "this scraped first."

---

## Part Five: Technical Notes

**Existing stack:** Next.js on Vercel, Supabase (Postgres), Stripe for payments, n8n for subscription automation, Python scrapers, Google Calendar API for the 10 category calendars.

**Scraper architecture:** Each source is an independent module. One failure never kills the run. Save raw data before processing. Support `--source X` for testing individual scrapers. Rate limit respectfully. Use Playwright only when a site is genuinely JS-rendered.

**Weekly cron:** Sundays 11 PM ET. Scrapes everything, dedupes, pushes to Supabase + Google Calendars, cleans up past events, logs results. Alert on failure.

**Performance budget:** Homepage under 1.5s FCP. Any list view under 2s. API responses cached 1 hour.

**Scale considerations:** At 5,000+ events, pagination and virtualization become mandatory. Don't ship anything that renders 5,000 DOM nodes.

---

## Part Six: Your Autonomy

**You are not just implementing a spec. You are building a product.**

Specifically, you should:

- **Propose better approaches.** If a specification in this document is wrong or there's a better way, say so and do the better thing.
- **Add features nobody asked for** if they clearly serve the mission. Ship it and explain why.
- **Cut features that aren't earning their place.** Complexity is a cost.
- **Flag when something is a bad idea** before spending hours building it.
- **Make design decisions.** Don't ask permission for every color and spacing choice. Have taste and use it.
- **Tell me what you'd prioritize.** You have more context on the codebase than anyone. If you think the weekly digest matters more than the map view, say so.

**When you finish a work session, report:**
1. What you built
2. What you decided differently from this brief and why
3. What you think should happen next and why
4. Anything that concerns you about the product direction

---

## The Test

Before shipping anything, ask: **would a New Yorker pay $2.99/month for this?**

If the honest answer is "not yet," name specifically what's missing and go build that.
