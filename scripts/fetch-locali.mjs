/**
 * fetch-locali.mjs
 * Fetches restaurants and bars for each Milan zone from OpenStreetMap
 * via the Overpass API and writes the result to locali.json.
 *
 * Usage:
 *   node scripts/fetch-locali.mjs
 *
 * Requirements: Node 18+  (uses built-in fetch)
 * No API key needed. Rate-limited to 1 request/zone to be polite.
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '../MilanoLocali/Resources/locali.json');

// ── Zone centers + search radius (meters) ───────────────────────────────────
const ZONES = {
  'Navigli':       { lat: 45.4506, lon: 9.1700, radius: 650 },
  'Brera':         { lat: 45.4728, lon: 9.1869, radius: 500 },
  'Porta Venezia': { lat: 45.4740, lon: 9.2025, radius: 600 },
  'Isola':         { lat: 45.4883, lon: 9.1889, radius: 500 },
  'Tortona':       { lat: 45.4597, lon: 9.1631, radius: 500 },
  'NoLo':          { lat: 45.4847, lon: 9.2089, radius: 600 },
  'Centrale':      { lat: 45.4862, lon: 9.2046, radius: 600 },
  'Duomo':         { lat: 45.4641, lon: 9.1919, radius: 550 },
  'Moscova':       { lat: 45.4796, lon: 9.1894, radius: 500 },
  'Lambrate':      { lat: 45.4793, lon: 9.2380, radius: 600 },
  'Città Studi':   { lat: 45.4753, lon: 9.2259, radius: 650 },
  'Loreto':        { lat: 45.4861, lon: 9.2143, radius: 500 },
};

// ── OSM amenity/cuisine → nostra categoria ──────────────────────────────────
function categorize(tags) {
  const amenity  = tags.amenity  || '';
  const cuisine  = (tags.cuisine || '').toLowerCase();
  const name     = (tags.name    || '').toLowerCase();

  if (cuisine.includes('sushi') || cuisine.includes('japanese')) return 'Sushi';
  if (cuisine.includes('pizza'))                                  return 'Pizza';
  if (amenity === 'cafe' || cuisine.includes('coffee'))           return 'Caffè';
  if (amenity === 'fast_food')                                    return 'Street Food';
  if (amenity === 'bar' || amenity === 'pub') {
    if (name.includes('aperitiv') || name.includes('spritz'))     return 'Aperitivo';
    if (name.includes('wine') || name.includes('vino') || name.includes('vineri')) return 'Vineria';
    return 'Cocktail Bar';
  }
  if (cuisine.includes('wine') || tags['craft'] === 'winery')     return 'Vineria';
  if (cuisine.includes('italian') || cuisine.includes('regional') ||
      name.includes('osteria') || name.includes('trattoria'))     return 'Osteria';
  return 'Ristorante';
}

// ── OSM price_range / stars → 1-4 ──────────────────────────────────────────
function priceRange(tags) {
  const raw = tags['price_range'] || tags['fee'] || '';
  if (raw.includes('€€€€') || raw === '$$$$') return 4;
  if (raw.includes('€€€')  || raw === '$$$')  return 3;
  if (raw.includes('€€')   || raw === '$$')   return 2;
  if (raw.includes('€')    || raw === '$')     return 1;
  const stars = parseInt(tags['stars'] || '0', 10);
  if (stars >= 4) return 4;
  if (stars === 3) return 3;
  return 2; // default mid-range
}

// ── Build tag list ───────────────────────────────────────────────────────────
function buildTags(tags, zona, cat) {
  const result = new Set();
  result.add(zona.toLowerCase());
  if (tags.outdoor_seating === 'yes') result.add('dehor');
  if (tags.takeaway       === 'yes') result.add('takeaway');
  if (tags.delivery       === 'yes') result.add('delivery');
  if (tags.wheelchair     === 'yes') result.add('accessibile');
  if ((tags.cuisine || '').includes('vegetarian') ||
      tags.diet_vegetarian === 'yes') result.add('vegetariano');
  if (tags.diet_vegan === 'yes') result.add('vegano');
  const cuisine = (tags.cuisine || '').replace(/_/g, ' ');
  if (cuisine && cuisine !== 'italian') result.add(cuisine);
  return [...result].slice(0, 5);
}

// ── Format OSM opening_hours into our 7-slot array ─────────────────────────
// Simple best-effort: returns null if unparseable.
function parseHours(raw) {
  if (!raw || raw === '24/7') return raw === '24/7'
    ? Array(7).fill('00:00-24:00')
    : null;
  // e.g. "Mo-Fr 12:00-15:00,18:00-23:00; Sa-Su 12:00-23:00"
  // We extract the first time range per day as a string for display.
  const days = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  const result = Array(7).fill(null);
  try {
    const rules = raw.split(';').map(s => s.trim()).filter(Boolean);
    for (const rule of rules) {
      const match = rule.match(/^([A-Za-z,\- ]+?)\s+(\d{2}:\d{2}-\d{2}:\d{2})/);
      if (!match) continue;
      const dayPart  = match[1].trim();
      const timePart = match[2];
      // Expand ranges like Mo-Fr
      const dayRange = dayPart.match(/^([A-Z][a-z])-([A-Z][a-z])$/);
      if (dayRange) {
        const s = days.indexOf(dayRange[1]);
        const e = days.indexOf(dayRange[2]);
        if (s >= 0 && e >= 0) for (let i = s; i <= e; i++) result[i] = timePart;
      } else {
        // Individual days separated by commas
        dayPart.split(',').map(d => d.trim()).forEach(d => {
          const i = days.indexOf(d);
          if (i >= 0) result[i] = timePart;
        });
      }
    }
    return result.some(Boolean) ? result : null;
  } catch { return null; }
}

// ── Generate a short Italian description ────────────────────────────────────
function makeDesc(tags, cat, zona) {
  const name = tags.name || '';
  const cuisine = (tags.cuisine || '').replace(/_/g, ' ');
  const phrases = {
    'Ristorante':   `Ristorante${cuisine ? ` di cucina ${cuisine}` : ''} nel cuore di ${zona}.`,
    'Osteria':      `Osteria tradizionale con cucina del territorio a ${zona}.`,
    'Pizza':        `Pizzeria a ${zona}, impasto artigianale e ingredienti selezionati.`,
    'Sushi':        `Ristorante giapponese a ${zona}, sushi e specialità orientali.`,
    'Caffè':        `Caffetteria storica a ${zona}, colazioni e pause caffè.`,
    'Cocktail Bar': `Cocktail bar a ${zona}, selezione di drink classici e signatures.`,
    'Aperitivo':    `Il posto giusto per l'aperitivo a ${zona}, Spritz e stuzzichini.`,
    'Vineria':      `Vineria a ${zona}, selezione di vini naturali e biodynamici.`,
    'Street Food':  `Street food a ${zona}, piatti veloci e ingredienti freschi.`,
    'Rooftop':      `Rooftop bar a ${zona} con vista sulla città.`,
  };
  return phrases[cat] || `Locale a ${zona}.`;
}

// ── Overpass query ───────────────────────────────────────────────────────────
function buildQuery(lat, lon, radius) {
  const amenities = ['restaurant','bar','cafe','pub','fast_food','food_court'];
  const filters = amenities.map(a =>
    `node["amenity"="${a}"]["name"](around:${radius},${lat},${lon});`
  ).join('\n  ');
  return `[out:json][timeout:25];
(
  ${filters}
);
out body;`;
}

// ── Slug helper ──────────────────────────────────────────────────────────────
function slug(str) {
  return str.toLowerCase()
    .replace(/[àáâ]/g,'a').replace(/[èéê]/g,'e')
    .replace(/[ìí]/g,'i').replace(/[òó]/g,'o').replace(/[ùú]/g,'u')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

// ── Main ─────────────────────────────────────────────────────────────────────
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const SLEEP_MS = 1500; // be polite to the free API
const sleep = ms => new Promise(r => setTimeout(r, ms));

const allLocali = [];
const seen = new Set();

for (const [zona, { lat, lon, radius }] of Object.entries(ZONES)) {
  console.log(`⏳  Fetching ${zona}…`);

  let elements = [];
  try {
    const body = buildQuery(lat, lon, radius);
    const res  = await fetch(OVERPASS, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(body)}`,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    elements = data.elements || [];
  } catch (e) {
    console.error(`  ✗ Error: ${e.message}`);
    await sleep(SLEEP_MS * 2);
    continue;
  }

  let count = 0;
  for (const el of elements) {
    const tags = el.tags || {};
    const name = (tags.name || '').trim();
    if (!name) continue;

    // Deduplicate by OSM id
    if (seen.has(el.id)) continue;
    seen.add(el.id);

    const cat     = categorize(tags);
    const id      = `${slug(zona)}-${slug(name)}`.slice(0, 60);
    const address = [tags['addr:street'], tags['addr:housenumber']]
      .filter(Boolean).join(' ') || tags['addr:full'] || '';
    const website = tags.website || tags['contact:website'] || null;
    const ig      = tags['contact:instagram']
      ? tags['contact:instagram'].replace(/^https?:\/\/(www\.)?instagram\.com\/?/,'').replace(/\/$/,'')
      : null;

    allLocali.push({
      id,
      name,
      zona,
      categoria: cat,
      address,
      description: makeDesc(tags, cat, zona),
      latitude:   el.lat,
      longitude:  el.lon,
      priceRange: priceRange(tags),
      tags:       buildTags(tags, zona, cat),
      instagramHandle: ig || null,
      websiteURL:      website || null,
      imageURL:        null,
      isNew:           false,
      rating:          tags['rating'] ? parseFloat(tags['rating']) : null,
      reviewCount:     null,
      hours:           parseHours(tags['opening_hours']),
    });
    count++;
  }
  console.log(`  ✓ ${count} locali trovati`);
  await sleep(SLEEP_MS);
}

writeFileSync(OUT, JSON.stringify(allLocali, null, 2), 'utf8');
console.log(`\n✅  Salvati ${allLocali.length} locali → ${OUT}`);
