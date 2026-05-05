"""Happy hour pipeline configuration."""
import os

# Load env
ENV_FILE = os.path.join(os.path.dirname(__file__), "..", ".env.local")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                os.environ.setdefault(k, v)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)

NEIGHBORHOODS = {
    "Manhattan": [
        "Lower East Side", "East Village", "West Village", "Greenwich Village",
        "SoHo", "NoHo", "Tribeca", "Chelsea", "Flatiron", "Gramercy",
        "Murray Hill", "Midtown East", "Midtown West", "Hell's Kitchen",
        "Upper East Side", "Upper West Side", "Harlem", "Washington Heights",
        "Financial District", "Chinatown", "Little Italy", "Nolita",
        "Meatpacking District", "NoMad", "Kips Bay", "Alphabet City", "Two Bridges",
    ],
    "Brooklyn": [
        "Williamsburg", "Bushwick", "Greenpoint", "DUMBO", "Park Slope",
        "Cobble Hill", "Carroll Gardens", "Boerum Hill", "Fort Greene",
        "Clinton Hill", "Prospect Heights", "Crown Heights", "Bay Ridge",
        "Sunset Park", "Red Hook", "Bed-Stuy", "Flatbush", "Brooklyn Heights", "Gowanus",
    ],
    "Queens": [
        "Astoria", "Long Island City", "Jackson Heights", "Flushing",
        "Forest Hills", "Sunnyside",
    ],
    "Bronx": ["South Bronx", "Fordham", "Arthur Avenue"],
}

SEARCH_QUERIES = [
    "happy hour {neighborhood} NYC",
    "bars with happy hour {neighborhood} New York",
    "cocktail lounge {neighborhood} NYC",
    "wine bar {neighborhood} NYC",
    "speakeasy {neighborhood} NYC",
    "dive bar {neighborhood} NYC",
    "rooftop bar {neighborhood} NYC",
    "beer garden {neighborhood} NYC",
    "hotel bar {neighborhood} NYC",
    "pub {neighborhood} NYC",
]

CHAINS = {
    "tgi friday", "applebee", "buffalo wild wings", "olive garden", "chili's",
    "dave & buster", "dave and buster", "hooters", "red lobster", "outback",
    "denny's", "dennys", "ihop", "yard house", "bj's restaurant", "margaritaville",
    "hard rock cafe", "planet hollywood", "shake shack", "sweetgreen", "chipotle",
    "panera", "starbucks", "dunkin", "mcdonald", "burger king", "wendy's",
    "subway", "popeyes", "chick-fil-a", "five guys", "wingstop", "domino's",
    "pizza hut", "taco bell", "kfc", "arby's", "sonic drive", "jack in the box",
    "panda express", "nando's", "cheesecake factory", "p.f. chang", "benihana",
    "morton's", "ruth's chris", "capital grille", "the capital grille",
    "texas roadhouse", "cracker barrel", "waffle house", "golden corral",
    "bob evans", "perkins", "sizzler", "el pollo loco", "del taco",
    "whataburger", "in-n-out", "raising cane", "jersey mike", "firehouse subs",
    "jimmy john", "potbelly", "jason's deli", "mcalister's", "zaxby",
}
