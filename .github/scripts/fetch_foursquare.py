"""
Fetches restaurant/bar data for 12 Milan zones from OpenStreetMap via the
Overpass API and writes the result to docs/foursquare-data.json.

No API key needed. Sleeps 1.5 s between zones to be polite to the free API.
"""

import json
import os
import re
import time
import urllib.parse
import urllib.request

OVERPASS = "https://overpass-api.de/api/interpreter"
SLEEP_S  = 1.5
OUT_FILE = "docs/foursquare-data.json"

ZONES = [
    ("Navigli",       45.4506, 9.1700, 650),
    ("Brera",         45.4728, 9.1869, 500),
    ("Porta Venezia", 45.4740, 9.2025, 600),
    ("Isola",         45.4883, 9.1889, 500),
    ("Tortona",       45.4597, 9.1631, 500),
    ("NoLo",          45.4847, 9.2089, 600),
    ("Centrale",      45.4862, 9.2046, 600),
    ("Duomo",         45.4641, 9.1919, 550),
    ("Moscova",       45.4796, 9.1894, 500),
    ("Lambrate",      45.4793, 9.2380, 600),
    ("Città Studi",   45.4753, 9.2259, 650),
    ("Loreto",        45.4861, 9.2143, 500),
]

AMENITIES = ["restaurant", "bar", "cafe", "pub", "fast_food", "food_court"]

DESCRIPTIONS = {
    "Ristorante":   lambda cuisine, zona: f"Ristorante{f' di cucina {cuisine}' if cuisine else ''} nel cuore di {zona}.",
    "Osteria":      lambda _, zona: f"Osteria tradizionale con cucina del territorio a {zona}.",
    "Pizza":        lambda _, zona: f"Pizzeria a {zona}, impasto artigianale e ingredienti selezionati.",
    "Sushi":        lambda _, zona: f"Ristorante giapponese a {zona}, sushi e specialità orientali.",
    "Caffè":        lambda _, zona: f"Caffetteria storica a {zona}, colazioni e pause caffè.",
    "Cocktail Bar": lambda _, zona: f"Cocktail bar a {zona}, selezione di drink classici e signatures.",
    "Aperitivo":    lambda _, zona: f"Il posto giusto per l'aperitivo a {zona}, Spritz e stuzzichini.",
    "Vineria":      lambda _, zona: f"Vineria a {zona}, selezione di vini naturali e biodynamici.",
    "Street Food":  lambda _, zona: f"Street food a {zona}, piatti veloci e ingredienti freschi.",
    "Rooftop":      lambda _, zona: f"Rooftop bar a {zona} con vista sulla città.",
}


def categorize(tags):
    amenity = tags.get("amenity", "")
    cuisine = tags.get("cuisine", "").lower()
    name    = tags.get("name", "").lower()

    if "sushi" in cuisine or "japanese" in cuisine:  return "Sushi"
    if "pizza" in cuisine:                           return "Pizza"
    if amenity == "cafe" or "coffee" in cuisine:     return "Caffè"
    if amenity == "fast_food":                       return "Street Food"
    if amenity in ("bar", "pub"):
        if "aperitiv" in name or "spritz" in name:  return "Aperitivo"
        if "wine" in name or "vino" in name or "vineri" in name: return "Vineria"
        return "Cocktail Bar"
    if "wine" in cuisine or tags.get("craft") == "winery": return "Vineria"
    if "italian" in cuisine or "regional" in cuisine or \
       "osteria" in name or "trattoria" in name:    return "Osteria"
    return "Ristorante"


def price_range(tags):
    raw = tags.get("price_range") or tags.get("fee") or ""
    if "€€€€" in raw or raw == "$$$$": return 4
    if "€€€"  in raw or raw == "$$$":  return 3
    if "€€"   in raw or raw == "$$":   return 2
    if "€"    in raw or raw == "$":    return 1
    stars = int(tags.get("stars") or "0")
    if stars >= 4: return 4
    if stars == 3: return 3
    return 2


def build_tags(tags, zona, cat):
    result = []
    seen_t = set()

    def add(t):
        if t not in seen_t:
            seen_t.add(t)
            result.append(t)

    add(zona.lower())
    if tags.get("outdoor_seating") == "yes": add("dehor")
    if tags.get("takeaway")        == "yes": add("takeaway")
    if tags.get("delivery")        == "yes": add("delivery")
    if tags.get("wheelchair")      == "yes": add("accessibile")
    cuisine = tags.get("cuisine", "")
    if "vegetarian" in cuisine or tags.get("diet:vegetarian") == "yes": add("vegetariano")
    if tags.get("diet:vegan") == "yes": add("vegano")
    cleaned = cuisine.replace("_", " ")
    if cleaned and cleaned != "italian": add(cleaned)
    return result[:5]


def make_desc(tags, cat, zona):
    cuisine = tags.get("cuisine", "").replace("_", " ")
    fn = DESCRIPTIONS.get(cat)
    if fn:
        return fn(cuisine, zona)
    return f"Locale a {zona}."


def slug(s):
    s = s.lower()
    for src, dst in [("à","a"),("á","a"),("â","a"),("è","e"),("é","e"),("ê","e"),
                     ("ì","i"),("í","i"),("ò","o"),("ó","o"),("ù","u"),("ú","u")]:
        s = s.replace(src, dst)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def build_query(lat, lon, radius):
    filters = "\n  ".join(
        f'node["amenity"="{a}"]["name"](around:{radius},{lat},{lon});'
        for a in AMENITIES
    )
    return f'[out:json][timeout:30];\n(\n  {filters}\n);\nout body;'


def fetch_zone(zona, lat, lon, radius):
    query = build_query(lat, lon, radius)
    payload = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(
        OVERPASS,
        data=payload,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "MilanoLocali/1.0 (milan-restaurant-app)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=35) as resp:
        return json.loads(resp.read())


results = []
seen_ids = set()

for zona, lat, lon, radius in ZONES:
    print(f"  Fetching {zona}…")
    try:
        data = fetch_zone(zona, lat, lon, radius)
    except Exception as e:
        print(f"  {zona}: ERRORE - {e}")
        time.sleep(SLEEP_S * 2)
        continue

    count = 0
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name", "").strip()
        if not name:
            continue
        eid = el.get("id")
        if eid in seen_ids:
            continue
        seen_ids.add(eid)

        cat     = categorize(tags)
        lid     = f"{slug(zona)}-{slug(name)}"[:60]
        address = " ".join(filter(None, [
            tags.get("addr:street"), tags.get("addr:housenumber")
        ])) or tags.get("addr:full") or ""
        website = tags.get("website") or tags.get("contact:website") or None
        ig_raw  = tags.get("contact:instagram")
        ig = re.sub(r"^https?://(www\.)?instagram\.com/?", "", ig_raw).rstrip("/") \
             if ig_raw else None

        results.append({
            "id":              lid,
            "name":            name,
            "zona":            zona,
            "categoria":       cat,
            "address":         address,
            "description":     make_desc(tags, cat, zona),
            "latitude":        el.get("lat"),
            "longitude":       el.get("lon"),
            "priceRange":      price_range(tags),
            "tags":            build_tags(tags, zona, cat),
            "instagramHandle": ig,
            "websiteURL":      website,
            "imageURL":        None,
            "isNew":           False,
        })
        count += 1

    print(f"  {zona}: {count} locali")
    time.sleep(SLEEP_S)

print(f"\nTotale: {len(results)} locali unici")

if not results:
    print("ERRORE: nessun locale recuperato. Verifica la connessione a overpass-api.de.")
    print(f"{OUT_FILE} non sovrascritto.")
    raise SystemExit(1)

os.makedirs(os.path.dirname(OUT_FILE) or ".", exist_ok=True)
with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"Salvati {len(results)} locali → {OUT_FILE}")
