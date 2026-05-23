const DATA_URL = 'https://raw.githubusercontent.com/francescadilallo-cpu/App-Milan-Restaurant/main/MilanoLocali/Resources/locali.json';
const FSQ_URL  = 'https://raw.githubusercontent.com/francescadilallo-cpu/App-Milan-Restaurant/main/docs/foursquare-data.json';

/* ── Zone config ── */
/* `wiki` = Wikipedia page whose main image represents the zone.
   Photos are fetched at runtime via the MediaWiki API (CORS-enabled). */
const ZONE_META = {
  'Navigli':       { color: '#4A9EBF', wiki: 'Navigli',                          photo: '', desc: 'Il quartiere dei canali, cuore della movida milanese. Aperitivi sul Naviglio Grande, cocktail bar storici e osterie autentiche.' },
  'Brera':         { color: '#C4813A', wiki: 'Pinacoteca_di_Brera',              photo: '', desc: 'Il quartiere degli artisti. Gallerie, boutique e ristoranti raffinati in strade acciottolate. La Milano bohémienne.' },
  'Porta Venezia': { color: '#5B9E6B', wiki: 'Porta_Venezia',                    photo: '', desc: 'Quartiere multiculturale e vivace. Wine bar naturali, caffè indipendenti e una scena gastronomica in continua evoluzione.' },
  'Isola':         { color: '#3A7DC4', wiki: 'Bosco_Verticale',                  photo: '', desc: 'Il quartiere creativo per eccellenza. Dal Ceresio 7 ai cortili nascosti, Isola mescola design e autenticità.' },
  'Tortona':       { color: '#8B5E9E', wiki: 'Fondazione_Prada',                 photo: '', desc: 'Ex zona industriale diventata capitale del design. Spazi creativi, ristoranti stellati e cocktail bar botanici.' },
  'NoLo':          { color: '#D4607A', wiki: 'Via_Padova',                       photo: '', desc: 'North of Loreto: il quartiere più trendy di Milano. Pasticcerie di design, pescherie informali e locali indipendenti.' },
  'Centrale':      { color: '#5E7A9E', wiki: 'Milano_Centrale_railway_station',  photo: '', desc: 'Intorno alla maestosa stazione. Osterie autentiche, bar storici e una cucina popolare milanese rimasta intatta.' },
  'Duomo':         { color: '#B8963C', wiki: 'Milan_Cathedral',                  photo: '', desc: 'Il cuore di Milano. Dalla Galleria Vittorio Emanuele alle trattorie nascoste nei vicoli del centro storico.' },
  'Moscova':       { color: '#4E9E7A', wiki: 'Giardini_Pubblici_Indro_Montanelli', photo: '', desc: 'Quartiere elegante e residenziale. Ristoranti stellati, bar raffinati e una clientela che sa cosa vuole.' },
  'Lambrate':      { color: '#C4783A', wiki: 'Parco_Lambro',                    photo: '', desc: 'Quartiere east side in piena trasformazione. Il birrificio storico, spazi industriali e una vibe autentica.' },
  'Città Studi':   { color: '#7A5EC4', wiki: 'University_of_Milan',              photo: '', desc: 'Il quartiere universitario di Milano. Pizzerie economiche, gastronomie di qualità e caffè da mattina a notte.' },
  'Loreto':        { color: '#3A9EC4', wiki: 'Piazzale_Loreto',                  photo: '', desc: 'Crocevia tra NoLo e Porta Venezia. Pizza al taglio gourmet, bar di quartiere moderni e una scena in rapida crescita.' },
  'Chinatown':     { color: '#C0392B', wiki: 'Via_Paolo_Sarpi',                  photo: '', desc: 'Il quartiere cinese di Milano lungo Via Paolo Sarpi. Ristoranti autentici, dim sum, pasticcerie e una vivace scena gastronomica asiatica.' },
  // Secondary zones
  'Sempione':      { color: '#2ECC71', wiki: 'Parco_Sempione',                  photo: '', desc: 'Il polmone verde di Milano. Bar e ristoranti intorno al Parco Sempione, tra l\'Arco della Pace e il Castello Sforzesco.' },
  'Porta Romana':  { color: '#E67E22', wiki: 'Porta_Romana,_Milan',             photo: '', desc: 'Quartiere residenziale e gastronomico. Ristoranti di qualità, wine bar e caffè nel cuore della Milano borghese.' },
  'Ticinese':      { color: '#16A085', wiki: 'Colonne_di_San_Lorenzo',          photo: '', desc: 'Tra le Colonne di San Lorenzo e i Navigli. Aperitivo al tramonto, osterie storiche e locali bohémien.' },
  'Repubblica':    { color: '#8E44AD', wiki: 'Piazza_della_Repubblica,_Milan',  photo: '', desc: 'Centro business e hotel di lusso. Ristoranti di qualità, cocktail bar e una gastronomia internazionale.' },
  'Corvetto':      { color: '#27AE60', wiki: 'Corvetto',                        photo: '', desc: 'Quartiere multiculturale in trasformazione. Cucine del mondo, locali di quartiere e una scena gastronomica autentica.' },
  'Bovisa':        { color: '#2980B9', wiki: 'Politecnico_di_Milano',           photo: '', desc: 'Il quartiere del Politecnico. Pizzerie, bar universitari e una vibrante scena giovane intorno al campus.' },
  'Washington':    { color: '#D35400', wiki: 'Fieramilanocity',                 photo: '', desc: 'Quartiere residenziale vicino alla Fiera. Ristoranti di quartiere, enoteche e una gastronomia autentica milanese.' },
  'Niguarda':      { color: '#1ABC9C', wiki: 'Niguarda',                        photo: '', desc: 'Quartiere nord di Milano in crescita. Bar di quartiere, pizzerie e una scena locale genuina lontana dai turisti.' },
  'Greco':         { color: '#7F8C8D', wiki: 'Greco,_Milan',                   photo: '', desc: 'Quartiere operaio con carattere. Trattorie popolari, bar storici e un\'autenticità milanese difficile da trovare altrove.' },
};

/* Fetch zone hero images from Wikipedia at runtime (CORS-enabled).
   Cached in localStorage for 7 days. */
async function loadZonePhotos() {
  const CACHE_KEY = 'mlZonePhotos_v2';
  const CACHE_TIME_KEY = 'mlZonePhotosTime_v2';
  const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  const cachedAt = parseInt(localStorage.getItem(CACHE_TIME_KEY) || '0', 10);
  const fresh = Date.now() - cachedAt < FRESH_MS;

  // Apply cached values immediately if present
  for (const zona in cached) {
    if (ZONE_META[zona]) ZONE_META[zona].photo = cached[zona];
  }
  if (fresh && Object.keys(cached).length === Object.keys(ZONE_META).length) return;

  // Fetch missing/stale from Wikipedia
  const updated = { ...cached };
  await Promise.all(Object.entries(ZONE_META).map(async ([zona, meta]) => {
    if (!meta.wiki) return;
    if (fresh && cached[zona]) return;
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(meta.wiki)}&prop=pageimages&format=json&pithumbsize=800&origin=*`;
      const r = await fetch(url);
      if (!r.ok) return;
      const data = await r.json();
      const pages = data.query && data.query.pages;
      if (!pages) return;
      const page = Object.values(pages)[0];
      const src = page && page.thumbnail && page.thumbnail.source;
      if (src) {
        ZONE_META[zona].photo = src;
        updated[zona] = src;
      }
    } catch (e) { /* ignore network errors */ }
  }));
  localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
}

/* ── Category config — SVG icons, no emoji ── */
const CAT_META = {
  'Ristorante':   { color: '#FF6B6B', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>' },
  'Cocktail Bar': { color: '#9B59B6', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8z"/></svg>' },
  'Aperitivo':    { color: '#E67E22', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M6 2h12l-2 8H8z"/></svg>' },
  'Caffè':        { color: '#795548', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>' },
  'Pizza':        { color: '#FF5722', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 2 2 22l10-4 10 4Z"/><path d="m12 2-5 10"/></svg>' },
  'Osteria':      { color: '#C0392B', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/></svg>' },
  'Sushi':        { color: '#1ABC9C', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 12H2.1"/><path d="M12 2v10"/></svg>' },
  'Street Food':  { color: '#F39C12', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>' },
  'Rooftop':      { color: '#3498DB', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
  'Vineria':      { color: '#8E44AD', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 3 8 10h8z"/></svg>' },
};

const PRICE = ['', '€', '€€', '€€€', '€€€€'];

/* ── State ── */
let allLocali = [];
let filterZona = null;
let filterCat  = null;
let filterOpenNow = false;
let searchQuery = '';
let favorites = new Set(JSON.parse(localStorage.getItem('mlFav') || '[]'));
let detailMap = null;
let mainMap   = null;
let mainMarkers = [];
let previousScreen = 'scopri';

/* ── Hours helpers ── */
function isOpenNow(locale) {
  if (!locale.hours || !Array.isArray(locale.hours)) return null;
  const now = new Date();
  const dayIdx = (now.getDay() + 6) % 7; // 0=Mon...6=Sun
  const todayStr = locale.hours[dayIdx];
  if (checkHours(todayStr, now, false)) return true;
  const yestStr = locale.hours[(dayIdx + 6) % 7];
  return checkHours(yestStr, now, true);
}

function checkHours(str, now, yesterday) {
  if (!str) return false;
  const parts = str.split('-');
  if (parts.length < 2) return false;
  const openStr = parts[0];
  const closeStr = parts[1];
  const openParts = openStr.split(':').map(Number);
  const closeParts = closeStr.split(':').map(Number);
  if (openParts.length < 2 || closeParts.length < 2) return false;
  const oh = openParts[0], om = openParts[1];
  const ch = closeParts[0], cm = closeParts[1];
  const curMin = now.getHours() * 60 + now.getMinutes();
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  const overnight = closeMin < openMin; // crosses midnight
  if (!yesterday) {
    if (!overnight) return curMin >= openMin && curMin < closeMin;
    return curMin >= openMin; // open side of overnight
  } else {
    if (!overnight) return false; // yesterday didn't go overnight
    return curMin < closeMin; // we're in the early-morning tail
  }
}

function formatHoursToday(locale) {
  if (!locale.hours || !Array.isArray(locale.hours)) return null;
  const dayIdx = (new Date().getDay() + 6) % 7;
  const str = locale.hours[dayIdx];
  return str || null; // null = chiuso oggi
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', async () => {
  // Onboarding
  const obSeen = localStorage.getItem('mlObSeen');
  if (!obSeen) {
    document.getElementById('onboarding').classList.remove('hidden');
  } else {
    document.getElementById('onboarding').classList.add('hidden');
  }
  document.getElementById('ob-start').addEventListener('click', () => dismissOnboarding(false));
  document.getElementById('ob-skip').addEventListener('click', () => dismissOnboarding(true));

  function dismissOnboarding(permanent) {
    if (permanent) localStorage.setItem('mlObSeen', '1');
    document.getElementById('onboarding').classList.add('hidden');
  }

  try {
    const [r, fsqR] = await Promise.all([
      fetch(DATA_URL),
      fetch(FSQ_URL).catch(() => null),
    ]);
    const curated = r.ok ? await r.json() : FALLBACK;
    const fsq     = (fsqR && fsqR.ok) ? await fsqR.json() : [];
    const names   = new Set(curated.map(l => l.name.toLowerCase()));
    allLocali = [...curated, ...fsq.filter(l => !names.has(l.name.toLowerCase()))];
  } catch { allLocali = FALLBACK; }

  // Fetch neighborhood photos from Wikipedia (uses localStorage cache).
  // Don't block first paint: render now, re-render once photos resolve.
  loadZonePhotos().then(() => renderScopri());

  buildCatBar();
  renderScopri();
  initMainMap();
  bindTabs();
  document.getElementById('search-input').addEventListener('input', e => { searchQuery = e.target.value.trim(); renderScopri(); });
  document.getElementById('btn-filter').addEventListener('click', openDrawer);
  document.getElementById('filter-overlay').addEventListener('click', closeDrawer);
  document.getElementById('back-from-zona').addEventListener('click', () => showScreen('scopri'));
  document.getElementById('back-from-detail').addEventListener('click', () => { const f = previousScreen; showScreen(f); if (f === 'preferiti') renderFav(); });
});

/* ── Filtering ── */
function filtered() {
  return allLocali.filter(l => {
    if (filterZona && l.zona !== filterZona) return false;
    if (filterCat  && l.categoria !== filterCat) return false;
    if (filterOpenNow && isOpenNow(l) !== true) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && !l.description.toLowerCase().includes(q) &&
          !l.zona.toLowerCase().includes(q) && !(l.tags||[]).some(t=>t.toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

/* ── Scopri ── */
function renderScopri() {
  const byZona = {};
  filtered().forEach(l => { (byZona[l.zona] = byZona[l.zona]||[]).push(l); });
  const grid = document.getElementById('zone-grid');
  grid.innerHTML = '';
  const zones = Object.entries(byZona).sort((a,b)=>a[0].localeCompare(b[0]));
  if (!zones.length) { grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--label3);padding:48px 0;font-size:15px">Nessun risultato</p>'; return; }
  zones.forEach(([zona, items]) => {
    const meta  = ZONE_META[zona] || {};
    const color = meta.color || '#888';
    const photo = meta.photo || '';
    const card  = document.createElement('div');
    card.className = 'zone-card';
    card.style.setProperty('--zone-color', color);
    card.innerHTML = `
      ${photo ? `<img class="zone-card-img" src="${photo}" alt="${zona}" loading="lazy" onerror="this.parentElement.style.background='linear-gradient(145deg,${color}e0,${color}88)';this.remove()" />` : `<div class="zone-card-img-placeholder" style="background:${color}"></div>`}
      <div class="zone-card-overlay">
        <div class="zone-name">${zona}</div>
        <div class="zone-count">
          <span class="zone-count-pill">${items.length}</span>
          ${items.length === 1 ? 'locale' : 'locali'}
        </div>
      </div>`;
    card.addEventListener('click', () => showZona(zona));
    grid.appendChild(card);
  });
}

/* ── Category bar ── */
function buildCatBar() {
  const bar = document.getElementById('cat-bar');

  // "Aperto ora" chip first
  const openChip = document.createElement('button');
  openChip.className = 'cat-chip open-now-chip';
  openChip.id = 'open-now-chip';
  openChip.innerHTML = '<span class="open-badge"></span> Aperto ora';
  openChip.addEventListener('click', () => {
    filterOpenNow = !filterOpenNow;
    openChip.classList.toggle('active', filterOpenNow);
    renderScopri();
    if (document.getElementById('screen-mappa').classList.contains('active')) renderMapMarkers();
  });
  bar.appendChild(openChip);

  Object.entries(CAT_META).forEach(([name, meta]) => {
    const chip = document.createElement('button');
    chip.className = 'cat-chip';
    chip.dataset.cat = name;
    chip.textContent = name;
    chip.addEventListener('click', () => {
      filterCat = filterCat === name ? null : name;
      document.querySelectorAll('.cat-chip[data-cat]').forEach(c => c.classList.toggle('active', c.dataset.cat === filterCat));
      renderScopri();
      if (document.getElementById('screen-mappa').classList.contains('active')) renderMapMarkers();
    });
    bar.appendChild(chip);
  });
}

/* ── Zona list ── */
function showZona(zona) {
  previousScreen = 'scopri';
  document.getElementById('zona-title').textContent = zona;

  // Populate zona hero
  const zonaMeta = ZONE_META[zona] || {};
  const heroImg = document.getElementById('zona-hero-img');
  const heroDesc = document.getElementById('zona-hero-desc');
  if (zonaMeta.photo) {
    heroImg.src = zonaMeta.photo;
    heroImg.alt = zona;
    heroImg.style.display = 'block';
    document.getElementById('zona-hero').style.display = 'block';
  } else {
    document.getElementById('zona-hero').style.display = 'none';
  }
  heroDesc.textContent = zonaMeta.desc || '';

  const list = document.getElementById('zona-list');
  list.innerHTML = '';
  filtered().filter(l=>l.zona===zona).forEach(l => list.appendChild(makeLocaleItem(l, ()=>showDetail(l,'zona'))));
  showScreen('zona');
}

function makeLocaleItem(locale, onClick) {
  const meta = CAT_META[locale.categoria] || { color:'#888', icon:'' };
  const isFav = favorites.has(locale.id);
  const div = document.createElement('div');
  div.className = 'locale-item';
  const thumb = locale.imageURL
    ? `<img class="locale-thumb" src="${locale.imageURL}" alt="${locale.name}" loading="lazy" />`
    : `<div class="locale-icon-wrap" style="background:${meta.color}18">${meta.icon.replace('currentColor', meta.color)}</div>`;
  const ratingHtml = locale.rating
    ? `<span class="meta-sep">·</span><span style="font-size:11px;color:#FF9F0A;font-weight:700">★ ${locale.rating}</span>`
    : '';

  const openStatus = isOpenNow(locale);
  const hoursBadge = openStatus === true
    ? '<span class="hours-badge open" style="margin-left:4px"><span class="open-badge"></span>Aperto</span>'
    : openStatus === false
    ? '<span class="hours-badge closed" style="margin-left:4px">Chiuso</span>'
    : '';

  div.innerHTML = `
    ${thumb}
    <div class="locale-body">
      <div class="locale-top">
        <span class="locale-name">${locale.name}</span>
        ${locale.isNew ? '<span class="badge-new">Nuovo</span>' : ''}
      </div>
      <div class="locale-meta">
        <span class="cat-dot" style="background:${meta.color}"></span>
        <span class="cat-text">${locale.categoria}</span>
        <span class="meta-sep">·</span>
        <span class="price-text">${PRICE[locale.priceRange]||''}</span>
        ${ratingHtml}
        ${hoursBadge}
      </div>
      <div class="locale-address">${locale.address}</div>
    </div>
    <div class="locale-actions">
      <button class="fav-btn${isFav?' active':''}" data-id="${locale.id}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav?'currentColor':'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <svg class="chevron-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  div.querySelector('.locale-body').addEventListener('click', onClick);
  const clickable = div.querySelector('.locale-thumb') || div.querySelector('.locale-icon-wrap');
  if (clickable) clickable.addEventListener('click', onClick);
  div.querySelector('.fav-btn').addEventListener('click', e => { e.stopPropagation(); toggleFav(locale, e.currentTarget); });
  return div;
}

/* ── Share ── */
async function shareLocale(locale) {
  const text = `${locale.name} — ${locale.zona}, Milano\n${locale.address}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: locale.name, text, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(text);
      showToast('Copiato negli appunti!');
    }
  } catch (e) {
    if (e.name !== 'AbortError') showToast('Copiato negli appunti!');
  }
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

/* ── Detail ── */
function showDetail(locale, from) {
  previousScreen = from;
  const meta = CAT_META[locale.categoria] || { color:'#888', icon:'' };
  const isFav = favorites.has(locale.id);

  // Hero photo
  const heroImg = document.getElementById('detail-hero-img');
  if (locale.imageURL) {
    heroImg.src = locale.imageURL;
    heroImg.style.display = 'block';
  } else {
    heroImg.src = '';
    heroImg.style.display = 'none';
    document.getElementById('detail-hero').style.background = `${meta.color}22`;
  }

  // Hero overlay text
  document.getElementById('detail-hero-overlay').innerHTML = `
    <div class="detail-hero-name">${locale.name}</div>
    <div class="detail-hero-sub">
      <span class="detail-hero-zona">${locale.zona}</span>
      <span style="color:rgba(255,255,255,.5)">·</span>
      <span class="detail-hero-price">${PRICE[locale.priceRange]||''}</span>
      ${locale.rating ? `<span style="color:rgba(255,255,255,.5)">·</span><span style="color:#FFD60A;font-size:13px;font-weight:700">★ ${locale.rating}</span>` : ''}
    </div>`;

  // Floating fav button
  const favBtn = document.getElementById('detail-fav-floating');
  favBtn.classList.toggle('active', isFav);
  favBtn.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
  favBtn.onclick = () => toggleFav(locale, favBtn);

  // Share button
  document.getElementById('detail-share-btn').addEventListener('click', () => shareLocale(locale));

  // Stars helper
  function starsHtml(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let s = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) s += '<span class="star" style="color:#FF9F0A">★</span>';
      else if (i === full && half) s += '<span class="star" style="color:#FF9F0A">½</span>';
      else s += '<span class="star" style="color:#E5E5EA">★</span>';
    }
    return s;
  }

  // Hours line
  const todayHours = formatHoursToday(locale);
  const openNow = isOpenNow(locale);
  let hoursLine = '';
  if (todayHours) {
    hoursLine = `<div style="margin-bottom:14px;display:flex;align-items:center;gap:8px">
      ${openNow ? '<span class="hours-badge open"><span class="open-badge"></span>Aperto ora</span>' : '<span class="hours-badge closed">Chiuso ora</span>'}
      <span style="font-size:13px;color:var(--label3)">Oggi ${todayHours}</span>
    </div>`;
  } else if (locale.hours && Array.isArray(locale.hours)) {
    hoursLine = `<div style="margin-bottom:14px"><span class="hours-badge closed">Chiuso oggi</span></div>`;
  }

  document.getElementById('detail-body').innerHTML = `
    ${locale.rating ? `
    <div class="rating-row">
      <div class="stars">${starsHtml(locale.rating)}</div>
      <span class="rating-score">${locale.rating}</span>
      <span class="rating-count">${locale.reviewCount ? `(${locale.reviewCount.toLocaleString('it')} recensioni)` : ''}</span>
    </div>` : ''}

    ${hoursLine}

    ${(locale.tags||[]).length ? `<div class="tag-row">${locale.tags.map(t=>`<span class="tag-chip">${t}</span>`).join('')}</div>` : ''}

    <p class="detail-desc">${locale.description}</p>

    ${locale.instagramHandle ? `
    <a class="ig-card" href="https://instagram.com/${locale.instagramHandle}" target="_blank">
      <div class="ig-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <rect x="2" y="2" width="20" height="20" rx="5"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none"/>
        </svg>
      </div>
      <div class="ig-info">
        <div class="ig-handle">@${locale.instagramHandle}</div>
        <div class="ig-sub">Vedi su Instagram</div>
      </div>
      <svg class="info-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </a>` : ''}

    <div class="detail-card">
      <div class="info-row">
        <span class="info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
        <span class="info-text">${locale.address}</span>
      </div>
      ${locale.websiteURL ? `
      <a class="info-row" href="${locale.websiteURL}" target="_blank">
        <span class="info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
        <span class="info-text">${locale.websiteURL.replace(/^https?:\/\//,'')}</span>
        <svg class="info-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </a>` : ''}
    </div>

    <button class="map-toggle-btn" id="d-map-toggle">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
      Mostra sulla mappa
    </button>
    <div class="map-collapsible" id="d-map-wrap">
      <div id="detail-map"></div>
    </div>

    <button class="detail-maps-btn" id="d-maps">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg>
      Apri in Maps
    </button>`;

  // Map toggle
  let mapOpen = false;
  document.getElementById('d-map-toggle').addEventListener('click', () => {
    mapOpen = !mapOpen;
    const wrap = document.getElementById('d-map-wrap');
    wrap.classList.toggle('open', mapOpen);
    document.getElementById('d-map-toggle').textContent = mapOpen ? '▲ Nascondi mappa' : '🗺 Mostra sulla mappa';
    if (mapOpen) {
      setTimeout(() => {
        if (detailMap) { detailMap.remove(); detailMap = null; }
        detailMap = L.map('detail-map', { zoomControl:false, attributionControl:false, dragging:false, scrollWheelZoom:false, touchZoom:false })
          .setView([locale.latitude, locale.longitude], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(detailMap);
        const icon = L.divIcon({ className:'', html: makePin(meta.color), iconSize:[32,40], iconAnchor:[16,40] });
        L.marker([locale.latitude, locale.longitude], { icon }).addTo(detailMap);
        detailMap.invalidateSize();
      }, 60);
    }
  });

  document.getElementById('d-maps').addEventListener('click', () =>
    window.open(`https://maps.apple.com/?q=${encodeURIComponent(locale.name)}&ll=${locale.latitude},${locale.longitude}`,'_blank')
  );

  showScreen('detail');
}

/* ── Map ── */
function makePin(color) {
  return `<div class="map-pin">
    <div class="map-pin-circle" style="border-color:${color}33">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="2.5" fill="${color}" stroke="none"/>
      </svg>
    </div>
    <div class="map-pin-tail" style="background:${color}66"></div>
  </div>`;
}

function initMainMap() {
  mainMap = L.map('main-map', { zoomControl:false, attributionControl:false }).setView([45.4654, 9.1859], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mainMap);
  L.control.zoom({ position:'topright' }).addTo(mainMap);
  renderMapMarkers();
}

function renderMapMarkers() {
  mainMarkers.forEach(m => m.remove());
  mainMarkers = [];
  filtered().forEach(locale => {
    const color = (CAT_META[locale.categoria]||{}).color || '#007AFF';
    const icon = L.divIcon({ className:'', html: makePin(color), iconSize:[32,40], iconAnchor:[16,40] });
    const m = L.marker([locale.latitude, locale.longitude], { icon }).addTo(mainMap);
    m.on('click', () => showMapSheet(locale));
    mainMarkers.push(m);
  });
}

function showMapSheet(locale) {
  const meta = CAT_META[locale.categoria] || { color:'#888' };
  const isFav = favorites.has(locale.id);
  const sheet = document.getElementById('map-sheet');
  document.getElementById('map-sheet-content').innerHTML = `
    <div class="sheet-name">${locale.name}</div>
    <div class="sheet-sub">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${meta.color};margin-right:5px;vertical-align:middle"></span>
      ${locale.zona} · ${locale.categoria} · ${PRICE[locale.priceRange]||''}
    </div>
    <div class="sheet-desc">${locale.description}</div>
    <div class="sheet-actions">
      <button class="sheet-detail-btn" id="s-detail">Vedi dettagli</button>
      <button class="sheet-fav-btn${isFav?' active':''}" id="s-fav">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFav?'currentColor':'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>`;
  sheet.classList.remove('hidden');
  document.getElementById('s-detail').addEventListener('click', () => { sheet.classList.add('hidden'); showDetail(locale,'mappa'); });
  document.getElementById('s-fav').addEventListener('click', e => toggleFav(locale, e.currentTarget));
}

document.addEventListener('click', e => {
  const sheet = document.getElementById('map-sheet');
  if (!sheet.classList.contains('hidden') && !sheet.contains(e.target) && !e.target.closest('.map-pin')) sheet.classList.add('hidden');
});

/* ── Preferiti ── */
function renderFav() {
  const favLocali = allLocali.filter(l => favorites.has(l.id));
  const list = document.getElementById('fav-list');
  const empty = document.getElementById('fav-empty');
  list.innerHTML = '';
  if (!favLocali.length) { empty.classList.remove('hidden'); list.style.display = 'none'; }
  else { empty.classList.add('hidden'); list.style.display = ''; favLocali.forEach(l => list.appendChild(makeLocaleItem(l, ()=>showDetail(l,'preferiti')))); }
}

/* ── Favorites ── */
function toggleFav(locale, btn) {
  favorites.has(locale.id) ? favorites.delete(locale.id) : favorites.add(locale.id);
  localStorage.setItem('mlFav', JSON.stringify([...favorites]));
  const filled = favorites.has(locale.id);

  // update all instances
  document.querySelectorAll(`.fav-btn[data-id="${locale.id}"]`).forEach(b => {
    b.classList.toggle('active', filled);
    b.querySelector('svg').setAttribute('fill', filled ? 'currentColor' : 'none');
  });
  [btn].forEach(b => {
    if (!b.dataset.id) { // detail / sheet btn
      b.classList.toggle('active', filled);
      const svg = b.querySelector('svg');
      if (svg) svg.setAttribute('fill', filled ? 'currentColor' : 'none');
    }
  });
  if (document.getElementById('screen-preferiti').classList.contains('active')) renderFav();
}

/* ── Tabs ── */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.tab;
      showScreen(name);
      if (name === 'preferiti') renderFav();
      if (name === 'mappa') renderMapMarkers();
    });
  });
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  if (name === 'mappa' && mainMap) setTimeout(() => mainMap.invalidateSize(), 60);
}

/* ── Filter drawer ── */
function openDrawer() {
  const list = document.getElementById('drawer-zone-list');
  list.innerHTML = '';

  const allItem = mkDrawerItem(null, 'Tutte le zone', '#AEAEB2');
  list.appendChild(allItem);

  const sep = document.createElement('div'); sep.style.cssText = 'height:1px;background:var(--sep);margin:0 18px'; list.appendChild(sep);

  Object.entries(ZONE_META).forEach(([zona, meta]) => list.appendChild(mkDrawerItem(zona, zona, meta.color)));

  const clear = document.createElement('button');
  clear.className = 'drawer-clear';
  clear.textContent = 'Azzera filtri';
  clear.addEventListener('click', () => {
    filterZona = null; filterCat = null; filterOpenNow = false;
    document.querySelectorAll('.cat-chip[data-cat]').forEach(c => c.classList.remove('active'));
    const openChip = document.getElementById('open-now-chip');
    if (openChip) openChip.classList.remove('active');
    closeDrawer(); renderScopri();
  });
  list.appendChild(clear);

  document.getElementById('filter-overlay').classList.remove('hidden');
  document.getElementById('filter-drawer').classList.remove('hidden');
}

function mkDrawerItem(zona, label, color) {
  const item = document.createElement('div');
  item.className = 'drawer-item';
  const isActive = zona === null ? filterZona === null : filterZona === zona;
  item.innerHTML = `
    <div class="drawer-item-left">
      <span class="drawer-zone-dot" style="background:${color}"></span>
      ${label}
    </div>
    ${isActive ? '<svg class="drawer-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}`;
  item.addEventListener('click', () => { filterZona = zona; closeDrawer(); renderScopri(); });
  return item;
}

function closeDrawer() {
  document.getElementById('filter-overlay').classList.add('hidden');
  document.getElementById('filter-drawer').classList.add('hidden');
}

/* ── Fallback data ── */
const FALLBACK = [
  // NAVIGLI
  { id:"el-brellin", name:"El Brellin", zona:"Navigli", categoria:"Osteria", address:"Vicolo dei Lavandai, 14", description:"Osteria storica milanese affacciata sul Naviglio Grande. Cucina tradizionale con risotto alla milanese e cotoletta.", latitude:45.4551, longitude:9.1730, priceRange:3, tags:["milanese","tradizionale","risotto"], instagramHandle:"elbrellin", websiteURL:"https://www.elbrellin.it", isNew:false, hours:["12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00",null] },
  { id:"mag-cafe", name:"Mag Café", zona:"Navigli", categoria:"Cocktail Bar", address:"Ripa di Porta Ticinese, 43", description:"Uno dei cocktail bar più amati dei Navigli. Ottimo per l'aperitivo e il dopocena.", latitude:45.4540, longitude:9.1721, priceRange:2, tags:["cocktail","gin","aperitivo"], instagramHandle:"magcafemilano", websiteURL:null, isNew:false, hours:[null,"18:00-01:00","18:00-01:00","18:00-01:00","18:00-02:00","18:00-02:00","17:00-00:00"] },
  { id:"upcycle", name:"Upcycle", zona:"Navigli", categoria:"Cocktail Bar", address:"Via Corsico, 8", description:"Cocktail bar sostenibile con ingredienti stagionali e zero sprechi. Cocktail creativi con botaniche artigianali.", latitude:45.4555, longitude:9.1740, priceRange:2, tags:["sustainable","cocktail","creative"], instagramHandle:"upcyclemilano", websiteURL:null, isNew:false, hours:[null,"18:00-01:00","18:00-01:00","18:00-01:00","18:00-02:00","18:00-02:00","17:00-00:00"] },
  { id:"drogheria-milanese", name:"Drogheria Milanese", zona:"Navigli", categoria:"Vineria", address:"Via Cola di Rienzo, 7", description:"Vineria informale sui Navigli con vini naturali e piccola cucina stagionale.", latitude:45.4547, longitude:9.1712, priceRange:2, tags:["vino naturale","navigli","informale"], instagramHandle:"drogheramilanese", websiteURL:null, isNew:false, hours:["18:00-01:00","18:00-01:00","18:00-01:00","18:00-01:00","18:00-01:00","18:00-01:00",null] },
  { id:"rita-navigli", name:"Rita", zona:"Navigli", categoria:"Cocktail Bar", address:"Via Angelo Fumagalli, 1", description:"Uno dei cocktail bar più amati di Milano. Vermouth fatto in casa, cocktail classici in uno spazio minimal.", latitude:45.4557, longitude:9.1732, priceRange:2, tags:["vermouth","cocktail","culto"], instagramHandle:"ritamilano", websiteURL:null, isNew:false, hours:[null,"18:30-01:30","18:30-01:30","18:30-01:30","18:30-02:00","18:30-02:00","17:30-01:00"] },
  { id:"carlo-e-camilla", name:"Carlo e Camilla in Segheria", zona:"Navigli", categoria:"Ristorante", address:"Via Meda, 24", description:"Ristorante di Carlo Cracco in una ex segheria con lampadari scenografici e tavoli comuni. Cucina italiana creativa.", latitude:45.4547, longitude:9.1767, priceRange:3, tags:["cracco","design","italiano"], instagramHandle:"carloecamilla", websiteURL:"https://www.carloecamillainsegheria.it", isNew:false, hours:[null,"12:30-14:30","12:30-14:30","12:30-14:30","12:30-23:30","12:30-23:30","12:30-22:30"] },
  { id:"al-pont-de-ferr", name:"Al Pont de Ferr", zona:"Navigli", categoria:"Ristorante", address:"Ripa di Porta Ticinese, 55", description:"Una stella Michelin sul Naviglio Grande. Cucina milanese contemporanea con ingredienti del territorio.", latitude:45.4553, longitude:9.1718, priceRange:3, tags:["michelin","milanese","canale"], instagramHandle:"alpontdeferr", websiteURL:"https://www.alpontdeferr.it", isNew:false, hours:[null,"12:30-14:00",null,"12:30-14:00","12:30-23:00","12:30-23:00","12:30-22:00"] },
  { id:"contraste", name:"Contraste", zona:"Navigli", categoria:"Ristorante", address:"Via Meda, 2", description:"Due stelle Michelin. Lo chef Matias Perdomo propone menu surreali che ribaltano le aspettative. Indimenticabile.", latitude:45.4544, longitude:9.1764, priceRange:4, tags:["michelin","creativo","fine dining"], instagramHandle:"contrastemilano", websiteURL:"https://www.contrastemilano.it", isNew:false, hours:[null,null,"19:30-22:30","19:30-22:30","19:30-22:30","12:30-14:00","12:30-22:30"] },
  { id:"28-posti", name:"28 Posti", zona:"Navigli", categoria:"Ristorante", address:"Via Corsico, 1", description:"Solo 28 posti. Cucina italiana creativa con forte attenzione al territorio. Uno dei tavoli più desiderati di Milano.", latitude:45.4556, longitude:9.1742, priceRange:3, tags:["creativo","intimo","territorio"], instagramHandle:"28postimilano", websiteURL:null, isNew:false, hours:[null,"12:30-14:30","12:30-14:30","12:30-14:30","12:30-23:00","12:30-23:00",null] },
  { id:"backdoor43", name:"BackDoor 43", zona:"Navigli", categoria:"Cocktail Bar", address:"Ripa di Porta Ticinese, 43", description:"Il bar più piccolo del mondo: solo 3 posti, prenotazione obbligatoria. Cocktail a base di whisky e bartender mascherato.", latitude:45.4541, longitude:9.1720, priceRange:3, tags:["whisky","esclusivo","unico"], instagramHandle:"backdoor43_milano", websiteURL:"https://backdoor43.com", isNew:false, hours:[null,"18:00-23:00","18:00-23:00","18:00-23:00","18:00-23:00","18:00-23:00","18:00-23:00"] },
  // BRERA
  { id:"pisacco", name:"Pisacco", zona:"Brera", categoria:"Ristorante", address:"Via Solferino, 48", description:"Wine bar e ristorante nel cuore di Brera con oltre 300 etichette. Cucina mediterranea raffinata.", latitude:45.4740, longitude:9.1870, priceRange:3, tags:["wine","mediterraneo"], instagramHandle:"pisaccomilano", websiteURL:null, isNew:false, hours:[null,"12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-22:00"] },
  { id:"bar-brera", name:"Bar Brera", zona:"Brera", categoria:"Caffè", address:"Via Brera, 23", description:"Caffè storico frequentato da artisti e intellettuali. Colazioni e aperitivi nell'atmosfera di Brera.", latitude:45.4733, longitude:9.1880, priceRange:2, tags:["storico","arte","aperitivo"], instagramHandle:null, websiteURL:null, isNew:false, hours:["07:30-20:00","07:30-20:00","07:30-20:00","07:30-20:00","07:30-20:00","08:00-20:00","09:00-19:00"] },
  { id:"dry-milano", name:"Dry Milano", zona:"Brera", categoria:"Pizza", address:"Via Solferino, 33", description:"Cocktail bar e pizzeria gourmet che ha rivoluzionato Milano. Impasto a lunga lievitazione, cocktail abbinati.", latitude:45.4737, longitude:9.1862, priceRange:2, tags:["pizza","cocktail","gourmet"], instagramHandle:"drymilano", websiteURL:"https://www.drymilano.it", isNew:false, hours:[null,"12:00-23:30","12:00-23:30","12:00-23:30","12:00-23:30","12:00-23:30","12:00-22:30"] },
  { id:"sushi-b", name:"Sushi B", zona:"Brera", categoria:"Sushi", address:"Via Luca Beltrami, 1", description:"Omakase giapponese nel cuore di Brera. Solo 8 posti al bancone. Pesce importato direttamente dal Giappone.", latitude:45.4720, longitude:9.1871, priceRange:4, tags:["omakase","giapponese","esclusivo"], instagramHandle:"sushibmilano", websiteURL:"https://www.sushib.it", isNew:false, hours:[null,"12:00-14:30","12:00-14:30","12:00-14:30","12:00-23:00","12:00-23:00",null] },
  { id:"nombra-de-vin", name:"N'Ombra de Vin", zona:"Brera", categoria:"Vineria", address:"Via San Marco, 2", description:"Enoteca storica in un refettorio agostiniano del XV secolo. Atmosfera magica, migliaia di etichette.", latitude:45.4741, longitude:9.1882, priceRange:2, tags:["storico","enoteca","atmosfera"], instagramHandle:"nombradevin", websiteURL:null, isNew:false, hours:["12:00-20:00","12:00-22:00","12:00-22:00","12:00-22:00","12:00-22:00","12:00-23:00","12:00-20:00"] },
  { id:"latteria-san-marco", name:"Latteria di San Marco", zona:"Brera", categoria:"Osteria", address:"Via San Marco, 24", description:"Trattoria culto di Brera, frequentata da artisti per decenni. Cucina milanese casalinga autentica.", latitude:45.4743, longitude:9.1886, priceRange:2, tags:["tradizionale","culto","casalingo"], instagramHandle:null, websiteURL:null, isNew:false, hours:["12:00-14:30","12:00-22:00","12:00-22:00","12:00-22:00","12:00-22:00","12:00-22:00",null] },
  { id:"fioraio-bianchi", name:"Fioraio Bianchi Caffè", zona:"Brera", categoria:"Caffè", address:"Via Montebello, 7", description:"Caffè romantico all'interno di una fioreria. Circondato da fiori freschi, perfetto per brunch e colazioni speciali.", latitude:45.4756, longitude:9.1895, priceRange:2, tags:["romantico","brunch","fiori"], instagramHandle:"fioraiobianchicaffe", websiteURL:null, isNew:false, hours:["09:00-18:00","09:00-22:00","09:00-22:00","09:00-22:00","09:00-22:00","09:00-22:00","10:00-18:00"] },
  { id:"bulgari-bar", name:"Bulgari Bar", zona:"Brera", categoria:"Cocktail Bar", address:"Via Privata Fratelli Gabba, 7b", description:"Il bar più esclusivo di Milano nell'Hotel Bulgari. Cocktail d'autore affacciati sul giardino privato.", latitude:45.4716, longitude:9.1893, priceRange:4, tags:["luxury","hotel","esclusivo"], instagramHandle:"bulgarihotels", websiteURL:"https://www.bulgarihotels.com", isNew:false, hours:["07:00-01:00","07:00-01:00","07:00-01:00","07:00-01:00","07:00-01:00","07:00-01:00","07:00-01:00"] },
  // PORTA VENEZIA
  { id:"erba-brusca", name:"Erba Brusca", zona:"Porta Venezia", categoria:"Ristorante", address:"Alzaia Naviglio Pavese, 286", description:"Ristorante-orto con giardino estivo. Cucina vegetale e territoriale ispirata all'orto coltivato direttamente.", latitude:45.4458, longitude:9.1792, priceRange:3, tags:["vegetale","orto","romantico"], instagramHandle:"erbabrusca", websiteURL:"https://www.erbabrusca.it", isNew:false, hours:[null,"12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-22:00"] },
  { id:"champagne-socialist", name:"Champagne Socialist", zona:"Porta Venezia", categoria:"Vineria", address:"Via Lecco, 3", description:"Wine bar naturale e informale. Selezione di vini da piccoli produttori, taglieri e atmosfera conviviale.", latitude:45.4757, longitude:9.2068, priceRange:2, tags:["vino naturale","informale"], instagramHandle:"champagnesocialistmilano", websiteURL:null, isNew:true, hours:[null,"17:00-00:00","17:00-00:00","17:00-00:00","17:00-01:00","17:00-01:00","16:00-00:00"] },
  { id:"radetzky", name:"Caffè Radetzky", zona:"Porta Venezia", categoria:"Caffè", address:"Corso Garibaldi, 105", description:"Storico caffè milanese con dehors su Corso Garibaldi. Perfetto per colazione, pranzo veloce e aperitivo.", latitude:45.4773, longitude:9.1916, priceRange:2, tags:["storico","dehors","aperitivo"], instagramHandle:null, websiteURL:null, isNew:false, hours:["07:30-20:00","07:30-20:00","07:30-20:00","07:30-20:00","07:30-20:00","08:00-20:00","09:00-19:00"] },
  { id:"bar-basso", name:"Bar Basso", zona:"Porta Venezia", categoria:"Cocktail Bar", address:"Via Plinio, 39", description:"Inventore del Negroni Sbagliato. Dal 1947 un'istituzione: bicchieri enormi, atmosfera autentica.", latitude:45.4730, longitude:9.2089, priceRange:2, tags:["negroni","storico","istituzione"], instagramHandle:"barbassomilano", websiteURL:null, isNew:false, hours:["18:30-02:00","18:30-02:00","18:30-02:00","18:30-02:00","18:30-02:00","18:30-02:00",null] },
  { id:"joia", name:"Joia", zona:"Porta Venezia", categoria:"Ristorante", address:"Via Panfilo Castaldi, 18", description:"Il primo ristorante vegetariano stellato d'Europa. Lo chef Pietro Leemann trasforma la cucina vegetale in arte.", latitude:45.4773, longitude:9.2063, priceRange:4, tags:["vegetariano","michelin","innovativo"], instagramHandle:"joiamilan", websiteURL:"https://www.joia.it", isNew:false, hours:[null,"12:30-14:00","12:30-14:00","12:30-14:00","12:30-23:00","12:30-23:00",null] },
  { id:"elita", name:"Elita", zona:"Porta Venezia", categoria:"Cocktail Bar", address:"Via Copernico, 38", description:"Cocktail bar hipster molto frequentato. Vini naturali, distillati selezionati, DJ set nel weekend.", latitude:45.4743, longitude:9.2077, priceRange:2, tags:["cocktail","naturale","DJ"], instagramHandle:"elitamilano", websiteURL:null, isNew:true, hours:[null,"18:00-01:00","18:00-01:00","18:00-01:00","18:00-02:00","18:00-02:00","17:00-00:00"] },
  { id:"spaccanapoli", name:"Spaccanapoli", zona:"Porta Venezia", categoria:"Pizza", address:"Via Boscovich, 50", description:"Pizzeria napoletana autentica. Forno a legna, mozzarella di bufala DOP, impasto tradizionale.", latitude:45.4782, longitude:9.2084, priceRange:1, tags:["napoletana","forno a legna","bufala"], instagramHandle:"spaccanapolimilano", websiteURL:null, isNew:false, hours:["12:00-23:30","12:00-23:30","12:00-23:30","12:00-23:30","12:00-23:30","12:00-23:30","12:00-23:00"] },
  { id:"da-giacomo", name:"Da Giacomo", zona:"Porta Venezia", categoria:"Ristorante", address:"Via Pasquale Sottocorno, 6", description:"Istituzione milanese per il pesce fresco dal 1942. Frequentato da vip e intellettuali. Ambiente elegante e classico.", latitude:45.4693, longitude:9.2017, priceRange:4, tags:["pesce","lusso","classico","istituzione"], instagramHandle:"dagiacomomomilano", websiteURL:"https://giacomomilano.com", isNew:false, hours:[null,"12:30-14:30","12:30-14:30","12:30-14:30","12:30-23:00","12:30-23:00","12:30-14:30"] },
  // ISOLA
  { id:"ceresio7", name:"Ceresio 7", zona:"Isola", categoria:"Rooftop", address:"Via Ceresio, 7", description:"Ristorante e piscina rooftop con vista panoramica su Milano. Meta imperdibile per l'aperitivo al tramonto.", latitude:45.4839, longitude:9.1857, priceRange:4, tags:["rooftop","piscina","vista"], instagramHandle:"ceresio7", websiteURL:"https://www.ceresio7.com", isNew:false, hours:[null,null,"19:00-02:00","19:00-02:00","19:00-02:00","19:00-02:00","19:00-02:00"] },
  { id:"lacerba", name:"Lacerba", zona:"Isola", categoria:"Cocktail Bar", address:"Via Benedetto Marcello, 7", description:"Cocktail bar raffinato con una delle migliori selezioni di gin e whisky a Milano. Atmosfera dark e curata.", latitude:45.4851, longitude:9.1888, priceRange:2, tags:["gin","whisky","dark"], instagramHandle:"lacerbamilano", websiteURL:null, isNew:false, hours:[null,"18:00-01:00","18:00-01:00","18:00-01:00","18:00-02:00","18:00-02:00","17:00-00:00"] },
  { id:"frida", name:"Frida", zona:"Isola", categoria:"Aperitivo", address:"Via Antonio Pollaiuolo, 3", description:"Locale cult con cortile estivo. Aperitivo ricco e informale, ottima birra artigianale.", latitude:45.4855, longitude:9.1902, priceRange:1, tags:["aperitivo","cortile","birra artigianale"], instagramHandle:"fridaisola", websiteURL:null, isNew:false, hours:[null,"17:00-00:00","17:00-00:00","17:00-00:00","17:00-01:00","17:00-01:00","16:00-00:00"] },
  { id:"ceresio7-pool-bar", name:"Ceresio 7 Pool Bar", zona:"Isola", categoria:"Cocktail Bar", address:"Via Ceresio, 7", description:"Cocktail bar con piscina e vista sullo skyline. Drink eccellenti, musica ambient, tramonto indimenticabile.", latitude:45.4840, longitude:9.1860, priceRange:3, tags:["rooftop","skyline","piscina"], instagramHandle:"ceresio7", websiteURL:"https://www.ceresio7.com", isNew:false, hours:[null,null,"19:00-02:00","19:00-02:00","19:00-02:00","19:00-02:00","19:00-02:00"] },
  { id:"ratana", name:"Ratanà", zona:"Isola", categoria:"Ristorante", address:"Via Gaetano de Castillia, 28", description:"Bistrò moderno che celebra la cucina lombarda. Menu stagionale, ottima carta vini. Bib Gourmand Michelin.", latitude:45.4858, longitude:9.1896, priceRange:2, tags:["lombardo","stagionale","bib gourmand"], instagramHandle:"ristoranteratana", websiteURL:"https://www.ratana.it", isNew:false, hours:[null,"12:00-14:30","12:00-14:30","12:00-14:30","12:00-23:00","12:00-23:00","12:00-22:00"] },
  { id:"berton", name:"Berton", zona:"Isola", categoria:"Ristorante", address:"Via Mike Bongiorno, 13", description:"Una stella Michelin dello chef Andrea Berton. Cucina italiana contemporanea essenziale in ambiente minimalista.", latitude:45.4849, longitude:9.1880, priceRange:4, tags:["michelin","contemporaneo","fine dining"], instagramHandle:"bertonmilano", websiteURL:"https://www.bertonmilano.it", isNew:false, hours:[null,"12:30-14:30","12:30-14:30","12:30-14:30","12:30-23:00","12:30-23:00",null] },
  { id:"pinch-isola", name:"Pinch", zona:"Isola", categoria:"Cocktail Bar", address:"Via Thaon di Revel, 21", description:"Piccolo cocktail bar con grandi ambizioni. Ingredienti stagionali, tecniche innovative, atmosfera rilassata.", latitude:45.4860, longitude:9.1876, priceRange:2, tags:["cocktail","stagionale","emergente"], instagramHandle:"pinchmilano", websiteURL:null, isNew:true, hours:[null,"18:00-01:00","18:00-01:00","18:00-01:00","18:00-02:00","18:00-02:00","17:00-00:00"] },
  // TORTONA
  { id:"tokuyoshi", name:"Ristorante Tokuyoshi", zona:"Tortona", categoria:"Ristorante", address:"Via San Calocero, 3", description:"Una stella Michelin. Cucina di Yoji Tokuyoshi che fonde tradizione italiana e sensibilità giapponese.", latitude:45.4573, longitude:9.1768, priceRange:4, tags:["michelin","fusion","giapponese"], instagramHandle:"tokuyoshiristorante", websiteURL:"https://www.ristorantetokuyoshi.com", isNew:false, hours:[null,"12:00-14:30","12:00-14:30","12:00-14:30","12:00-23:00","12:00-23:00",null] },
  { id:"botanical-club", name:"The Botanical Club", zona:"Tortona", categoria:"Cocktail Bar", address:"Via Tortona, 33", description:"Distilleria e cocktail bar botanico. Gin artigianale prodotto in loco con botaniche fresche.", latitude:45.4560, longitude:9.1697, priceRange:3, tags:["gin","artigianale","botanico"], instagramHandle:"thebotanicalclub", websiteURL:"https://www.thebotanicalclub.com", isNew:false, hours:[null,"18:00-01:00","18:00-01:00","18:00-01:00","18:00-02:00","18:00-02:00","17:00-00:00"] },
  { id:"lume", name:"LUME Milano", zona:"Tortona", categoria:"Ristorante", address:"Via Watt, 37", description:"Due stelle Michelin. Una delle esperienze gastronomiche più straordinarie di Milano.", latitude:45.4534, longitude:9.1673, priceRange:4, tags:["michelin","fine dining"], instagramHandle:"lumemilano", websiteURL:"https://www.lumemilano.com", isNew:false, hours:[null,"19:30-23:00","19:30-23:00","19:30-23:00","19:30-23:00","19:30-23:00",null] },
  { id:"langosteria", name:"Langosteria", zona:"Tortona", categoria:"Ristorante", address:"Via Savona, 10", description:"Il tempio milanese del pesce. Crudi eccezionali, astice, ricci di mare e bottarga. Prenotazione indispensabile.", latitude:45.4542, longitude:9.1660, priceRange:4, tags:["pesce","crudi","astice","lusso"], instagramHandle:"langosteria", websiteURL:"https://www.langosteria.com", isNew:false, hours:[null,"12:30-23:30","12:30-23:30","12:30-23:30","12:30-23:30","12:30-23:30","12:30-22:30"] },
  { id:"zero-milano", name:"Zero Milano", zona:"Tortona", categoria:"Sushi", address:"Corso Magenta, 87", description:"Cucina giapponese kaiseki. Ramen con brodi cotti per ore, sushi di precisione e menu degustazione stagionali.", latitude:45.4622, longitude:9.1672, priceRange:3, tags:["giapponese","kaiseki","ramen"], instagramHandle:"zero_milano", websiteURL:null, isNew:false, hours:[null,"12:00-14:30","12:00-14:30","12:00-14:30","12:00-23:00","12:00-23:00","12:00-22:00"] },
  { id:"fingers-milan", name:"Finger's Milan", zona:"Tortona", categoria:"Ristorante", address:"Via Boccaccio, 54", description:"La fusion giapponese-italiana di Roberto Okabe. Piatti creativi che fondono ingredienti mediterranei e tecnica giapponese.", latitude:45.4553, longitude:9.1706, priceRange:3, tags:["fusion","giapponese","moda"], instagramHandle:"fingersmilano", websiteURL:null, isNew:false, hours:[null,"12:30-14:30","12:30-14:30","12:30-14:30","12:30-23:00","12:30-23:00","12:30-22:00"] },
  // NOLO
  { id:"pave", name:"Pavé", zona:"NoLo", categoria:"Caffè", address:"Via Felice Casati, 27", description:"Pasticceria e caffetteria dal design curato. Croissant e dolci artigianali tra i migliori di Milano.", latitude:45.4802, longitude:9.2061, priceRange:2, tags:["pasticceria","colazione","design"], instagramHandle:"pavemilano", websiteURL:"https://www.pavemilano.com", isNew:false, hours:["07:30-20:00","07:30-20:00","07:30-20:00","07:30-20:00","07:30-20:00","08:00-20:00",null] },
  { id:"pescheria-claudio", name:"Pescheria da Claudio", zona:"NoLo", categoria:"Ristorante", address:"Via Felice Casati, 16", description:"Pescheria e ristorante di pesce freschissimo. Crudi di mare eccellenti a prezzi onesti.", latitude:45.4799, longitude:9.2065, priceRange:2, tags:["pesce","crudi","fresco"], instagramHandle:null, websiteURL:null, isNew:false, hours:[null,"12:00-22:00","12:00-22:00","12:00-22:00","12:00-22:00","12:00-23:00","12:00-22:00"] },
  { id:"casa-ramen-super", name:"Casa Ramen Super", zona:"NoLo", categoria:"Ristorante", address:"Via Porro Lambertenghi, 25", description:"Il miglior ramen di Milano. Brodi cotti per 18 ore, noodles freschi fatti a mano.", latitude:45.4812, longitude:9.2054, priceRange:2, tags:["ramen","giapponese","noodles","culto"], instagramHandle:"casaramensuper", websiteURL:null, isNew:false, hours:[null,"12:00-15:00","12:00-15:00","12:00-15:00","12:00-22:30","12:00-22:30","12:00-21:00"] },
  { id:"sissi-pasticceria", name:"Pasticceria Sissi", zona:"NoLo", categoria:"Caffè", address:"Via Porro Lambertenghi, 13", description:"Pasticceria elegante con caffè di specialità. Colazioni memorabili con dolci stagionali.", latitude:45.4815, longitude:9.2052, priceRange:2, tags:["pasticceria","colazione","specialty coffee"], instagramHandle:"pasticceriasissi", websiteURL:null, isNew:false, hours:["07:30-19:00","07:30-19:00","07:30-19:00","07:30-19:00","07:30-19:00","08:00-19:00",null] },
  { id:"radici-wine", name:"Radici", zona:"NoLo", categoria:"Vineria", address:"Via Carmagnola, 5", description:"Wine bar dedicato ai vini naturali e biodinamici. Piccoli produttori e piatti semplici di qualità.", latitude:45.4820, longitude:9.2070, priceRange:2, tags:["naturale","biodinamico","vino"], instagramHandle:"radicimilano", websiteURL:null, isNew:true, hours:[null,"18:00-00:00","18:00-00:00","18:00-00:00","18:00-01:00","18:00-01:00","16:00-00:00"] },
  // CENTRALE
  { id:"osteria-acquabella", name:"Osteria dell'Acquabella", zona:"Centrale", categoria:"Osteria", address:"Via San Gregorio, 46", description:"Osteria lombarda senza fronzoli vicino alla Stazione Centrale. Menu fisso a pranzo con piatti della tradizione.", latitude:45.4855, longitude:9.2045, priceRange:1, tags:["lombardo","tradizionale","pranzo"], instagramHandle:null, websiteURL:null, isNew:false, hours:["12:00-22:00","12:00-22:00","12:00-22:00","12:00-22:00","12:00-22:00","12:00-22:00",null] },
  { id:"stazione-centrale-lounge", name:"Stazione Centrale Lounge", zona:"Centrale", categoria:"Caffè", address:"Piazza Duca d'Aosta, 1", description:"Bar nella storica e monumentale Stazione Centrale. Colazione veloce, spritz e panini.", latitude:45.4862, longitude:9.2045, priceRange:2, tags:["stazione","colazione","comodo"], instagramHandle:null, websiteURL:null, isNew:false, hours:["05:30-22:00","05:30-22:00","05:30-22:00","05:30-22:00","05:30-22:00","05:30-22:00","05:30-22:00"] },
  { id:"giulio-pane-ojo", name:"Giulio Pane e Ojo", zona:"Centrale", categoria:"Osteria", address:"Via Muratori, 10", description:"Trattoria romana a Milano. Cacio e pepe perfetta, amatriciana autentica. Atmosfera vivace.", latitude:45.4837, longitude:9.2032, priceRange:2, tags:["romano","cacio e pepe","amatriciana"], instagramHandle:"giulioepaneolio", websiteURL:null, isNew:false, hours:[null,"12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-22:00"] },
  { id:"da-noi-in", name:"Da Noi In", zona:"Centrale", categoria:"Ristorante", address:"Via Castaldi, 30", description:"Piccolo ristorante di quartiere con cucina italiana creativa. Menu che cambia ogni giorno in base alla stagione.", latitude:45.4778, longitude:9.2059, priceRange:2, tags:["stagionale","creativo","quartiere"], instagramHandle:null, websiteURL:null, isNew:false, hours:[null,"12:00-14:30","12:00-14:30","12:00-14:30","12:00-23:00","12:00-23:00",null] },
  { id:"acanto-restaurant", name:"Acanto", zona:"Centrale", categoria:"Ristorante", address:"Piazza della Repubblica, 17", description:"Ristorante elegante all'Hotel Principe di Savoia. Cucina italiana classica, servizio impeccabile.", latitude:45.4826, longitude:9.1978, priceRange:4, tags:["hotel","classico","elegante"], instagramHandle:"acantoristorante", websiteURL:null, isNew:false, hours:[null,"12:30-14:30","12:30-14:30","12:30-14:30","12:30-23:00","12:30-23:00","12:30-22:00"] },
  { id:"terrazza-gallia", name:"Terrazza Gallia", zona:"Centrale", categoria:"Rooftop", address:"Piazza Duca d'Aosta, 9 (Hotel Gallia)", description:"Panoramico al 7° piano dell'Hotel Gallia. Cucina italiana con consulenza dei fratelli Cerea (3 stelle Michelin).", latitude:45.4861, longitude:9.2046, priceRange:4, tags:["rooftop","panoramico","hotel","michelin"], instagramHandle:"terrazzagallia", websiteURL:"https://www.galliadining.com", isNew:false, hours:["12:00-00:00","12:00-00:00","12:00-00:00","12:00-00:00","12:00-01:00","12:00-01:00","12:00-00:00"] },
  // DUOMO
  { id:"savini-tartufi", name:"Savini Tartufi", zona:"Duomo", categoria:"Ristorante", address:"Galleria Vittorio Emanuele II", description:"Elegante ristorante nella storica Galleria Vittorio Emanuele. Specialità al tartufo d'eccellenza.", latitude:45.4659, longitude:9.1897, priceRange:4, tags:["tartufo","lusso","galleria","storico"], instagramHandle:"savinitartufi", websiteURL:"https://www.savinitartufi.it", isNew:false, hours:[null,"12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-22:00"] },
  { id:"luini", name:"Luini", zona:"Duomo", categoria:"Street Food", address:"Via Santa Radegonda, 16", description:"Dal 1888 il panzerotto più famoso di Milano. Un must assoluto a pochi passi dal Duomo.", latitude:45.4662, longitude:9.1889, priceRange:1, tags:["panzerotto","storico","must"], instagramHandle:"luinimilano", websiteURL:"https://www.luini.it", isNew:false, hours:["11:00-21:00","11:00-21:00","11:00-21:00","11:00-21:00","11:00-21:00","11:00-21:00",null] },
  { id:"trattoria-milanese", name:"Trattoria Milanese", zona:"Duomo", categoria:"Osteria", address:"Via Santa Marta, 11", description:"Dal 1933, la trattoria più autentica del centro. Casoeula, ossobuco e risotto alla milanese tradizionali.", latitude:45.4636, longitude:9.1856, priceRange:3, tags:["tradizionale","storico","ossobuco"], instagramHandle:null, websiteURL:null, isNew:false, hours:[null,"12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-22:00"] },
  { id:"sorbillo-milano", name:"Sorbillo Milano", zona:"Duomo", categoria:"Pizza", address:"Largo Corsia dei Servi, 11", description:"L'iconico pizzaiolo napoletano a Milano. Impasto perfetto, forno a legna, ingredienti DOP.", latitude:45.4641, longitude:9.1956, priceRange:2, tags:["napoletana","forno a legna","DOP"], instagramHandle:"sorbillomilano", websiteURL:null, isNew:false, hours:["12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00"] },
  { id:"cracco-galleria", name:"Cracco in Galleria", zona:"Duomo", categoria:"Ristorante", address:"Galleria Vittorio Emanuele II, 8", description:"Il flagship di Carlo Cracco nella Galleria. Café, cioccolateria, wine bar e ristorante stellato su più livelli.", latitude:45.4660, longitude:9.1896, priceRange:4, tags:["michelin","galleria","cracco","lusso"], instagramHandle:"craccoinmilan", websiteURL:"https://www.ristorantecracco.it", isNew:false, hours:["09:00-00:00","09:00-00:00","09:00-00:00","09:00-00:00","09:00-00:00","09:00-00:00","10:00-22:00"] },
  { id:"marchesi-duomo", name:"Pasticceria Marchesi", zona:"Duomo", categoria:"Caffè", address:"Via Santa Maria alla Porta, 11", description:"Pasticceria storica milanese dal 1824. Il miglior panettone e i marron glacés più ricercati di Milano.", latitude:45.4640, longitude:9.1838, priceRange:3, tags:["storico","panettone","pasticceria"], instagramHandle:"pasticceriamarchesi", websiteURL:"https://www.pasticceriamarchesi.com", isNew:false, hours:["09:00-20:00","09:00-20:00","09:00-20:00","09:00-20:00","09:00-20:00","09:00-20:00","09:00-19:00"] },
  { id:"princi-duomo", name:"Princi", zona:"Duomo", categoria:"Street Food", address:"Via Speronari, 6", description:"Il forno artigianale più famoso di Milano. Pane appena sfornato, pizza al taglio e focaccia.", latitude:45.4642, longitude:9.1860, priceRange:1, tags:["forno","pizza al taglio","focaccia"], instagramHandle:"princimilano", websiteURL:"https://www.princi.com", isNew:false, hours:["07:30-20:00","07:30-20:00","07:30-20:00","07:30-20:00","07:30-20:00","07:30-20:00","09:00-19:00"] },
  { id:"camparino-galleria", name:"Camparino in Galleria", zona:"Duomo", categoria:"Cocktail Bar", address:"Piazza del Duomo, 21 (Galleria Vittorio Emanuele II)", description:"Bar storico di Campari nella Galleria dal 1915. Interni Art Nouveau. Aperitivo Campari con vista sul Duomo.", latitude:45.4660, longitude:9.1899, priceRange:3, tags:["storico","campari","galleria","art nouveau"], instagramHandle:"camparino_in_galleria", websiteURL:"https://www.camparino.com", isNew:false, hours:["08:00-00:00","08:00-00:00","08:00-00:00","08:00-00:00","08:00-01:00","08:00-01:00","08:00-00:00"] },
  { id:"terrazza-aperol", name:"Terrazza Aperol", zona:"Duomo", categoria:"Rooftop", address:"Il Mercato del Duomo, Piazza del Duomo", description:"La terrazza Aperol con la vista più desiderata di Milano, affacciata sul Duomo. L'aperitivo milanese per eccellenza.", latitude:45.4657, longitude:9.1905, priceRange:3, tags:["aperol","rooftop","aperitivo","duomo"], instagramHandle:"terrazza_aperol", websiteURL:null, isNew:false, hours:["11:00-23:00","11:00-23:00","11:00-23:00","11:00-23:00","11:00-00:00","11:00-00:00","11:00-23:00"] },
  { id:"seta-mandarin", name:"Seta by Antonio Guida", zona:"Duomo", categoria:"Ristorante", address:"Via Andegari, 9 (Mandarin Oriental)", description:"Due stelle Michelin al Mandarin Oriental. Lo chef Antonio Guida fonde tecnica francese e anima italiana.", latitude:45.4693, longitude:9.1902, priceRange:4, tags:["michelin","fine dining","mandarin oriental"], instagramHandle:"setamilano", websiteURL:"https://www.mandarinoriental.com/milan/dining/seta", isNew:false, hours:[null,null,"19:30-22:30","19:30-22:30","19:30-22:30","19:30-22:30","19:30-22:30"] },
  // MOSCOVA
  { id:"moscova-bar", name:"Bar Moscova", zona:"Moscova", categoria:"Aperitivo", address:"Via Moscova, 32", description:"Classico bar milanese con dehors. Aperitivo con buffet generoso e atmosfera di quartiere.", latitude:45.4769, longitude:9.1922, priceRange:2, tags:["aperitivo","dehors","buffet"], instagramHandle:null, websiteURL:null, isNew:false, hours:[null,"17:00-00:00","17:00-00:00","17:00-00:00","17:00-01:00","17:00-01:00","16:00-00:00"] },
  { id:"vun-andrea-aprea", name:"Vun Andrea Aprea", zona:"Moscova", categoria:"Ristorante", address:"Via Gerolamo Silvio Fantoni, 7", description:"Una stella Michelin al Park Hyatt. Cucina partenopea reinterpretata in chiave contemporanea.", latitude:45.4785, longitude:9.1915, priceRange:4, tags:["michelin","napoletano","fine dining"], instagramHandle:"vunrestaurant", websiteURL:null, isNew:false, hours:[null,"12:30-22:30","12:30-22:30","12:30-22:30","12:30-22:30","12:30-22:30",null] },
  { id:"tano-passami-lolio", name:"Tano Passami l'Olio", zona:"Moscova", categoria:"Ristorante", address:"Via Villoresi, 16", description:"Ristorante stellato dedicato all'olio extravergine. Ogni piatto esalta un olio di produttore diverso.", latitude:45.4779, longitude:9.1908, priceRange:4, tags:["michelin","olio","innovativo"], instagramHandle:"tanopassamilolio", websiteURL:null, isNew:false, hours:[null,"19:30-23:00","19:30-23:00","19:30-23:00","19:30-23:00","19:30-23:00",null] },
  { id:"caffe-verdi", name:"Caffè Verdi", zona:"Moscova", categoria:"Caffè", address:"Via Giuseppe Verdi, 6", description:"Caffè elegante vicino al Teatro alla Scala. Perfetto per un aperitivo pre-teatro.", latitude:45.4755, longitude:9.1912, priceRange:2, tags:["teatro","classico","aperitivo","scala"], instagramHandle:null, websiteURL:null, isNew:false, hours:["07:30-21:00","07:30-21:00","07:30-21:00","07:30-21:00","07:30-21:00","08:00-21:00","09:00-20:00"] },
  { id:"princi-solferino", name:"Princi Solferino", zona:"Moscova", categoria:"Caffè", address:"Via Solferino, 12", description:"Il forno di Princi nel cuore di Moscova. Lunghi banconi in marmo, pane fragrante e caffè eccellente.", latitude:45.4748, longitude:9.1875, priceRange:1, tags:["forno","colazione","pane"], instagramHandle:"princimilano", websiteURL:"https://www.princi.com", isNew:false, hours:["07:00-20:00","07:00-20:00","07:00-20:00","07:00-20:00","07:00-20:00","07:00-20:00",null] },
  { id:"navigante-moscova", name:"Navigante", zona:"Moscova", categoria:"Ristorante", address:"Via Aristotele, 12", description:"Cucina italiana contemporanea stagionale. Cocktail bar aperto fino a tardi, atmosfera rilassata.", latitude:45.4762, longitude:9.1931, priceRange:2, tags:["contemporaneo","stagionale","rilassato"], instagramHandle:null, websiteURL:null, isNew:true, hours:[null,"12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:30","12:00-22:30"] },
  { id:"iyo-restaurant", name:"IYO", zona:"Moscova", categoria:"Sushi", address:"Via Piero della Francesca, 74", description:"L'unico ristorante etnico con stella Michelin in Italia. Kaiseki e sushi d'autore in ambiente minimalista.", latitude:45.4766, longitude:9.1766, priceRange:4, tags:["michelin","kaiseki","sushi","giapponese"], instagramHandle:"iyorestaurant", websiteURL:"https://www.iyo-restaurant.com", isNew:false, hours:[null,"12:30-14:00","12:30-14:00","12:30-14:00","12:30-22:30","12:30-22:30",null] },
  // LAMBRATE
  { id:"birrificio-lambrate", name:"Birrificio Lambrate", zona:"Lambrate", categoria:"Aperitivo", address:"Via Adelchi, 5", description:"Il birrificio artigianale più storico di Milano, fondato nel 1996. Birre prodotte in loco.", latitude:45.4787, longitude:9.2385, priceRange:1, tags:["birra artigianale","pub","storico"], instagramHandle:"birrificio_lambrate", websiteURL:"https://www.birrificiolambrate.com", isNew:false, hours:[null,"17:00-00:00","17:00-00:00","17:00-00:00","17:00-01:00","17:00-01:00","16:00-00:00"] },
  { id:"officina-12", name:"Officina 12", zona:"Lambrate", categoria:"Cocktail Bar", address:"Via Ventura, 6", description:"Cocktail bar creativo nell'ex distretto industriale. Birra artigianale, cocktail sperimentali, mattoni a vista.", latitude:45.4789, longitude:9.2398, priceRange:2, tags:["cocktail","industriale","alternativo"], instagramHandle:"officina12milano", websiteURL:null, isNew:false, hours:[null,"18:00-01:00","18:00-01:00","18:00-01:00","18:00-02:00","18:00-02:00","17:00-01:00"] },
  { id:"trattoria-macello", name:"Trattoria del Nuovo Macello", zona:"Lambrate", categoria:"Osteria", address:"Via Cesare Lombroso, 20", description:"Trattoria leggendaria nell'ex quartiere del macello. Cucina milanese autentica: trippa, bollito, nervetti.", latitude:45.4770, longitude:9.2412, priceRange:2, tags:["tradizionale","autentico","milanese"], instagramHandle:null, websiteURL:null, isNew:false, hours:["12:00-14:30","12:00-22:00","12:00-22:00","12:00-22:00","12:00-22:00","12:00-22:00",null] },
  { id:"biciclette-lambrate", name:"Biciclette", zona:"Lambrate", categoria:"Osteria", address:"Via Torti, 2", description:"Osteria moderna con selezione di vini naturali e cucina stagionale. Atmosfera rilassata da quartiere.", latitude:45.4793, longitude:9.2401, priceRange:2, tags:["vino naturale","stagionale","informale"], instagramHandle:"biciclettimilano", websiteURL:null, isNew:false, hours:[null,"18:00-23:30","18:00-23:30","18:00-23:30","12:00-23:30","12:00-23:30","12:00-22:30"] },
  { id:"materia-cafe", name:"Materia", zona:"Lambrate", categoria:"Caffè", address:"Via Ampere, 5", description:"Caffè di specialità e co-working space. Terza ondata, metodi filtro, latte art. Hub per i creativi di Lambrate.", latitude:45.4796, longitude:9.2379, priceRange:1, tags:["specialty coffee","co-working","terza ondata"], instagramHandle:"materiacafe", websiteURL:null, isNew:true, hours:["07:30-19:00","07:30-19:00","07:30-19:00","07:30-19:00","07:30-19:00","08:00-18:00",null] },
  // CITTÀ STUDI
  { id:"pizza-zio", name:"Pizza Zio", zona:"Città Studi", categoria:"Pizza", address:"Via Camperio, 8", description:"Pizzeria napoletana nel quartiere universitario. Impasto con farina di grano antico e lievito madre.", latitude:45.4764, longitude:9.2262, priceRange:1, tags:["napoletana","lievito madre","universitario"], instagramHandle:"pizzazio_milano", websiteURL:null, isNew:false, hours:[null,"12:00-23:30","12:00-23:30","12:00-23:30","12:00-23:30","12:00-23:30","12:00-22:30"] },
  { id:"fratelli-figurato", name:"Fratelli Figurato", zona:"Città Studi", categoria:"Ristorante", address:"Viale Abruzzi, 46", description:"Gastronomia e ristorante con una delle migliori selezioni di salumi e formaggi di Milano.", latitude:45.4791, longitude:9.2284, priceRange:3, tags:["salumi","formaggi","gastronomia"], instagramHandle:"fratelli_figurato", websiteURL:null, isNew:false, hours:["08:00-21:00","08:00-21:00","08:00-21:00","08:00-21:00","08:00-21:00","08:00-21:00",null] },
  { id:"spontini-cs", name:"Pizzeria Spontini", zona:"Città Studi", categoria:"Pizza", address:"Viale Abruzzi, 38", description:"La pizza al taglio più famosa di Milano dal 1953. Alta, soffice, con pomodoro abbondante. Un rito milanese.", latitude:45.4780, longitude:9.2258, priceRange:1, tags:["pizza al taglio","storico","milanese"], instagramHandle:"pizzeriaspontini", websiteURL:null, isNew:false, hours:["11:30-23:00","11:30-23:00","11:30-23:00","11:30-23:00","11:30-23:00","11:30-23:00","12:00-22:30"] },
  { id:"baffo-bistro", name:"Baffo", zona:"Città Studi", categoria:"Ristorante", address:"Via Giacomo Ventura, 3", description:"Bistrot creativo di quartiere con menu che cambia ogni giorno. Vini naturali, atmosfera gioiosa.", latitude:45.4769, longitude:9.2244, priceRange:2, tags:["creativo","bistrot","vino naturale"], instagramHandle:"baffomilano", websiteURL:null, isNew:false, hours:[null,"12:00-14:30","12:00-14:30","12:00-14:30","12:00-23:00","12:00-23:00",null] },
  { id:"crota-piemunteisa", name:"Crota Piemunteisa", zona:"Città Studi", categoria:"Osteria", address:"Via Hermada, 3", description:"Cucina piemontese autentica. Vitello tonnato, tajarin al ragù. Cantina eccezionale con i migliori nebbioli.", latitude:45.4757, longitude:9.2232, priceRange:3, tags:["piemontese","vitello tonnato","nebbiolo"], instagramHandle:null, websiteURL:null, isNew:false, hours:[null,"12:00-14:30","12:00-14:30","12:00-14:30","12:00-23:00","12:00-23:00","12:00-22:00"] },
  // LORETO
  { id:"ugo", name:"Ugo", zona:"Loreto", categoria:"Aperitivo", address:"Via Felice Cavallotti, 5", description:"Bar di quartiere moderno nel cuore di Loreto. Aperitivo informale con ottimi spritz e terrazza estiva.", latitude:45.4863, longitude:9.2098, priceRange:1, tags:["aperitivo","spritz","loreto","terrazza"], instagramHandle:"ugomilano", websiteURL:null, isNew:false, hours:[null,"17:00-01:00","17:00-01:00","17:00-01:00","17:00-01:00","17:00-01:00","17:00-01:00"] },
  { id:"taglio", name:"Taglio", zona:"Loreto", categoria:"Pizza", address:"Via Vigevano, 10", description:"Pizza al taglio gourmet. Impasto ad alta idratazione con farciture creative che cambiano ogni giorno.", latitude:45.4858, longitude:9.2071, priceRange:1, tags:["pizza al taglio","gourmet","creativo"], instagramHandle:"tagliomilano", websiteURL:null, isNew:true, hours:["11:30-22:00","11:30-22:00","11:30-22:00","11:30-22:00","11:30-22:00","11:30-22:00",null] },
  { id:"nonostante-marisa", name:"Nonostante Marisa", zona:"Loreto", categoria:"Osteria", address:"Via Brunico, 4", description:"Trattoria bizzarra e amatissima. Arredamento kitsch, cucina lombarda della nonna, grande selezione di grappa.", latitude:45.4867, longitude:9.2112, priceRange:2, tags:["culto","lombardo","kitsch","grappa"], instagramHandle:"nonostantemarisa", websiteURL:null, isNew:false, hours:[null,"12:30-14:30","12:30-14:30","12:30-14:30","12:30-23:00","12:30-23:00",null] },
  { id:"rocket-loreto", name:"Rocket", zona:"Loreto", categoria:"Cocktail Bar", address:"Via Donatello, 3", description:"Bar energico vicino a Piazza Loreto. DJ set il fine settimana, spritz generosi, cocktail solidi.", latitude:45.4871, longitude:9.2120, priceRange:1, tags:["DJ","cocktail","notturno"], instagramHandle:"rocketmilano", websiteURL:null, isNew:false, hours:[null,"18:00-01:00","18:00-01:00","18:00-01:00","18:00-02:30","18:00-02:30","17:00-01:00"] },
  { id:"american-graffiti-loreto", name:"American Graffiti", zona:"Loreto", categoria:"Street Food", address:"Via Imbonati, 18", description:"Hamburgeria americana di culto. Hamburger spessi, patatine croccanti e milkshake anni '50.", latitude:45.4878, longitude:9.2108, priceRange:1, tags:["hamburger","americano","studenti"], instagramHandle:"americangraffitimilano", websiteURL:null, isNew:false, hours:["12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:00","12:00-23:30","12:00-23:30","12:00-22:30"] }
];
