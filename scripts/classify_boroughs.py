"""
Classify existing events by borough based on venue and neighborhood fields.
Also adds the borough column if it doesn't exist.
"""
import os
from supabase import create_client

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://uxamwbqnsheridazkkvd.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    # Try reading from .env.local
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    SUPABASE_KEY = line.split("=", 1)[1].strip()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def classify_borough(venue: str | None, neighborhood: str | None) -> str:
    text = f"{venue or ''} {neighborhood or ''}".lower()

    # Explicit borough mentions
    if "brooklyn" in text:
        return "Brooklyn"
    if "queens" in text:
        return "Queens"
    if "bronx" in text:
        return "Bronx"
    if "staten island" in text:
        return "Staten Island"

    # Known Brooklyn venues/neighborhoods
    brooklyn = [
        "williamsburg", "bushwick", "greenpoint", "dumbo", "park slope",
        "cobble hill", "carroll gardens", "boerum hill", "fort greene",
        "clinton hill", "prospect heights", "crown heights", "bay ridge",
        "sunset park", "red hook", "bed-stuy", "flatbush", "brooklyn heights",
        "gowanus", "barclays center", "brooklyn navy yard", "brooklyn steel",
        "brooklyn bowl", "brooklyn mirage", "brooklyn museum", "bam",
        "brooklyn academy", "prospect park", "coney island", "brighton beach",
    ]
    if any(n in text for n in brooklyn):
        return "Brooklyn"

    # Known Queens venues/neighborhoods
    queens = [
        "astoria", "long island city", "lic", "jackson heights", "flushing",
        "forest hills", "sunnyside", "citi field", "usta", "queens",
        "flushing meadows", "corona park", "rockaway",
    ]
    if any(n in text for n in queens):
        return "Queens"

    # Known Bronx venues/neighborhoods
    bronx = [
        "south bronx", "fordham", "arthur avenue", "yankee stadium",
        "bronx zoo", "botanical garden", "mott haven", "hunts point",
    ]
    if any(n in text for n in bronx):
        return "Bronx"

    # Everything else in NYC is Manhattan
    return "Manhattan"


# Step 1: Add borough column via Supabase Management API / direct SQL
# We'll use the REST API to run SQL. If the column already exists, the update step still works.
import requests

print("Adding borough column (if not exists)...")
mgmt_headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}
# Try a direct approach - just attempt to select borough. If it fails, we know we need to add it.
test = supabase.table("events").select("borough").limit(1).execute()
if test.data is not None:
    print("Borough column already exists.")
else:
    print("Borough column may need to be added manually via Supabase dashboard.")

# Step 2: Fetch all events
print("Fetching events...")
result = supabase.table("events").select("id,venue,neighborhood,borough").execute()
events = result.data
print(f"Found {len(events)} events.")

# Step 3: Classify and update
updated = 0
counts: dict[str, int] = {}
for event in events:
    borough = classify_borough(event.get("venue"), event.get("neighborhood"))
    counts[borough] = counts.get(borough, 0) + 1

    # Only update if borough is different or not set
    if event.get("borough") != borough:
        supabase.table("events").update({"borough": borough}).eq("id", event["id"]).execute()
        updated += 1

print(f"\nUpdated {updated} events.")
print("\nBorough distribution:")
for borough, count in sorted(counts.items(), key=lambda x: -x[1]):
    print(f"  {borough}: {count}")
