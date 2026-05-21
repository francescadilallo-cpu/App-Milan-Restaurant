/* ── Data ── */
const DATA_URL = 'https://raw.githubusercontent.com/francescadilallo-cpu/App-Milan-Restaurant/main/MilanoLocali/Resources/locali.json';

const ZONE_META = {
  'Navigli':       { emoji: '🌊', gradient: 'linear-gradient(135deg,#1a6b8a,#0d3d52)' },
  'Brera':         { emoji: '🎨', gradient: 'linear-gradient(135deg,#8a4a1a,#52280d)' },
  'Porta Venezia': { emoji: '🌳', gradient: 'linear-gradient(135deg,#1a7a3a,#0d4520)' },
  'Isola':         { emoji: '🏝️', gradient: 'linear-gradient(135deg,#8a6a1a,#52380d)' },
  'Tortona':       { emoji: '🏭', gradient: 'linear-gradient(135deg,#5a1a8a,#2d0d52)' },
  'NoLo':          { emoji: '✨', gradient: 'linear-gradient(135deg,#8a1a5a,#520d30)' },
  'Centrale':      { emoji: '🚉', gradient: 'linear-gradient(135deg,#1a3a8a,#0d1e52)' },
  'Duomo':         { emoji: '⛪', gradient: 'linear-gradient(135deg,#8a7a1a,#524a0d)' },
  'Moscova':       { emoji: '🌿', gradient: 'linear-gradient(135deg,#1a8a6a,#0d5238)' },
  'Lambrate':      { emoji: '🍺', gradient: 'linear-gradient(135deg,#8a3a1a,#52200d)' },
  'Città Studi':   { emoji: '📚', gradient: 'linear-gradient(135deg,#3a1a8a,#1e0d52)' },
  'Loreto':        { emoji: '🔵', gradient: 'linear-gradient(135deg,#1a5a8a,#0d3052)' },
};

const CAT_META = {
  'Ristorante':   '🍽️',
  'Cocktail Bar': '🍸',
  'Aperitivo':    '🥂',
  'Caffè':        '☕',
  'Pizza':        '🍕',
  'Osteria':      '🫕',
  'Sushi':        '🍣',
  'Street Food':  '🌮',
  'Rooftop':      '🌆',
  'Vineria':      '🍷',
};

const PRICE = ['', '€', '€€', '€€€', '€€€€'];

/* ── State ── */
let allLocali = [];
let filterZona = null;
let filterCat = null;
let searchQuery = '';
let favorites = new Set(JSON.parse(localStorage.getItem('mlFav') || '[]'));
let detailMap = null;
let mainMap = null;
let mainMarkers = [];
let previousScreen = 'scopri';

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(DATA_URL);
    if (res.ok) allLocali = await res.json();
    else throw new Error();
  } catch {
    allLocali = FALLBACK_DATA;
  }
  buildCatBar();
  buildDrawerZones();
  renderScopri();
  initMainMap();
  bindTabs();
  bindSearch();
  bindFilter();
});

/* ── Helpers ── */
function filtered() {
  return allLocali.filter(l => {
    if (filterZona && l.zona !== filterZona) return false;
    if (filterCat && l.categoria !== filterCat) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!l.name.toLowerCase().includes(q) &&
          !l.description.toLowerCase().includes(q) &&
          !l.zona.toLowerCase().includes(q) &&
          !(l.tags || []).some(t => t.toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

function saveFavs() { localStorage.setItem('mlFav', JSON.stringify([...favorites])); }

/* ── Scopri ── */
function renderScopri() {
  const locali = filtered();
  const byZona = {};
  locali.forEach(l => { (byZona[l.zona] = byZona[l.zona] || []).push(l); });

  const grid = document.getElementById('zone-grid');
  grid.innerHTML = '';

  const zones = Object.entries(byZona).sort((a, b) => a[0].localeCompare(b[0]));
  if (!zones.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--label3);padding:48px 0;font-size:15px">Nessun risultato</p>';
    return;
  }

  zones.forEach(([zona, items]) => {
    const meta = ZONE_META[zona] || { emoji: '📍', gradient: '' };
    const card = document.createElement('div');
    card.className = 'zone-card';
    card.style.setProperty('--zone-gradient', meta.gradient);
    card.innerHTML = `
      <span class="zone-emoji">${meta.emoji}</span>
      <div class="zone-name">${zona}</div>
      <div class="zone-count"><strong>${items.length}</strong> ${items.length === 1 ? 'locale' : 'locali'}</div>
    `;
    card.addEventListener('click', () => showZona(zona));
    grid.appendChild(card);
  });
}

/* ── Category bar ── */
function buildCatBar() {
  const bar = document.getElementById('cat-bar');
  Object.entries(CAT_META).forEach(([name, emoji]) => {
    const chip = document.createElement('button');
    chip.className = 'cat-chip';
    chip.dataset.cat = name;
    chip.innerHTML = `<span>${emoji}</span> ${name}`;
    chip.addEventListener('click', () => {
      filterCat = filterCat === name ? null : name;
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === filterCat));
      renderScopri();
      if (document.getElementById('screen-mappa').classList.contains('active')) renderMapMarkers();
    });
    bar.appendChild(chip);
  });
}

/* ── Zona list ── */
function showZona(zona) {
  previousScreen = 'scopri';
  const meta = ZONE_META[zona] || { emoji: '📍' };
  document.getElementById('zona-title').textContent = `${meta.emoji} ${zona}`;

  const locali = filtered().filter(l => l.zona === zona);
  const list = document.getElementById('zona-list');
  list.innerHTML = '';
  locali.forEach(l => list.appendChild(makeLocaleItem(l, () => showDetail(l, 'zona'))));

  showScreen('zona');
}

function makeLocaleItem(locale, onClick) {
  const isFav = favorites.has(locale.id);
  const emoji = CAT_META[locale.categoria] || '🍽️';
  const div = document.createElement('div');
  div.className = 'locale-item';
  div.innerHTML = `
    <div class="locale-icon">${emoji}</div>
    <div class="locale-body">
      <div class="locale-top">
        <span class="locale-name">${locale.name}</span>
        ${locale.isNew ? '<span class="badge-new">NUOVO</span>' : ''}
      </div>
      <div class="locale-meta">
        <span class="cat-label">${locale.categoria}</span>
        <span class="dot">·</span>
        <span class="price-label">${PRICE[locale.priceRange] || ''}</span>
      </div>
      <div class="locale-address">${locale.address}</div>
    </div>
    <div class="locale-actions">
      <button class="fav-btn" data-id="${locale.id}">${isFav ? '❤️' : '🤍'}</button>
      <svg class="chevron-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  `;
  div.querySelector('.locale-body').addEventListener('click', onClick);
  div.querySelector('.locale-icon').addEventListener('click', onClick);
  div.querySelector('.fav-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleFav(locale.id, e.currentTarget);
  });
  return div;
}

/* ── Detail ── */
function showDetail(locale, from) {
  previousScreen = from;
  const emoji = CAT_META[locale.categoria] || '🍽️';
  const isFav = favorites.has(locale.id);

  document.getElementById('detail-body').innerHTML = `
    <div class="detail-header">
      <div>
        <div class="detail-name">${locale.name}</div>
        <div class="detail-zona">${locale.zona} &nbsp;·&nbsp; <span class="detail-price">${PRICE[locale.priceRange] || ''}</span></div>
      </div>
      <button class="detail-fav-btn" id="detail-fav-btn">${isFav ? '❤️' : '🤍'}</button>
    </div>
    ${(locale.tags || []).length ? `<div class="tag-row">${locale.tags.map(t => `<span class="tag-chip">#${t}</span>`).join('')}</div>` : ''}
    <p class="detail-desc">${locale.description}</p>
    <div class="detail-sep"></div>
    <div class="info-row"><span class="info-icon">📍</span><span class="info-text">${locale.address}</span></div>
    ${locale.instagramHandle ? `<div class="info-row"><span class="info-icon">📸</span><span class="info-text"><a href="https://instagram.com/${locale.instagramHandle}" target="_blank">@${locale.instagramHandle}</a></span></div>` : ''}
    ${locale.websiteURL ? `<div class="info-row"><span class="info-icon">🌐</span><span class="info-text"><a href="${locale.websiteURL}" target="_blank">${locale.websiteURL}</a></span></div>` : ''}
    <button class="detail-maps-btn" id="detail-maps-btn">Apri in Google Maps →</button>
  `;

  document.getElementById('detail-fav-btn').addEventListener('click', e => toggleFav(locale.id, e.currentTarget));
  document.getElementById('detail-maps-btn').addEventListener('click', () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${locale.latitude},${locale.longitude}`, '_blank');
  });

  setTimeout(() => {
    if (detailMap) { detailMap.remove(); detailMap = null; }
    detailMap = L.map('detail-map', {
      zoomControl: false, attributionControl: false,
      dragging: false, scrollWheelZoom: false, touchZoom: false
    }).setView([locale.latitude, locale.longitude], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(detailMap);
    const icon = L.divIcon({ className: '', html: `<div class="map-marker">${emoji}</div>`, iconSize: [40, 40], iconAnchor: [20, 20] });
    L.marker([locale.latitude, locale.longitude], { icon }).addTo(detailMap);
    detailMap.invalidateSize();
  }, 60);

  showScreen('detail');
}

/* ── Main map ── */
function initMainMap() {
  mainMap = L.map('main-map', {
    zoomControl: false,
    attributionControl: false
  }).setView([45.4654, 9.1859], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mainMap);
  L.control.zoom({ position: 'topright' }).addTo(mainMap);
  renderMapMarkers();
}

function renderMapMarkers() {
  mainMarkers.forEach(m => m.remove());
  mainMarkers = [];

  filtered().forEach(locale => {
    const emoji = CAT_META[locale.categoria] || '📍';
    const icon = L.divIcon({ className: '', html: `<div class="map-marker">${emoji}</div>`, iconSize: [40, 40], iconAnchor: [20, 40] });
    const marker = L.marker([locale.latitude, locale.longitude], { icon }).addTo(mainMap);
    marker.on('click', () => showMapSheet(locale));
    mainMarkers.push(marker);
  });
}

function showMapSheet(locale) {
  const emoji = CAT_META[locale.categoria] || '🍽️';
  const isFav = favorites.has(locale.id);
  const sheet = document.getElementById('map-sheet');
  document.getElementById('map-sheet-content').innerHTML = `
    <div class="sheet-name">${locale.name}</div>
    <div class="sheet-sub">${locale.zona} · ${emoji} ${locale.categoria} · ${PRICE[locale.priceRange] || ''}</div>
    <div class="sheet-desc">${locale.description}</div>
    <div class="sheet-actions">
      <button class="sheet-detail-btn" id="sheet-detail-btn">Vedi dettagli →</button>
      <button class="sheet-fav-btn" id="sheet-fav-btn">${isFav ? '❤️' : '🤍'}</button>
    </div>
  `;
  sheet.classList.remove('hidden');

  document.getElementById('sheet-detail-btn').addEventListener('click', () => {
    sheet.classList.add('hidden');
    showDetail(locale, 'mappa');
  });
  document.getElementById('sheet-fav-btn').addEventListener('click', e => toggleFav(locale.id, e.currentTarget));
}

document.addEventListener('click', e => {
  const sheet = document.getElementById('map-sheet');
  if (!sheet.classList.contains('hidden') && !sheet.contains(e.target) && !e.target.closest('.map-marker')) {
    sheet.classList.add('hidden');
  }
});

/* ── Preferiti ── */
function renderFav() {
  const favLocali = allLocali.filter(l => favorites.has(l.id));
  const list = document.getElementById('fav-list');
  const empty = document.getElementById('fav-empty');
  list.innerHTML = '';

  if (!favLocali.length) {
    empty.classList.remove('hidden');
    list.style.display = 'none';
  } else {
    empty.classList.add('hidden');
    list.style.display = '';
    favLocali.forEach(l => list.appendChild(makeLocaleItem(l, () => showDetail(l, 'preferiti'))));
  }
}

/* ── Favorites ── */
function toggleFav(id, btn) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  saveFavs();

  const heart = favorites.has(id) ? '❤️' : '🤍';
  document.querySelectorAll(`.fav-btn[data-id="${id}"]`).forEach(b => b.textContent = heart);
  if (btn.id === 'detail-fav-btn' || btn.id === 'sheet-fav-btn') btn.textContent = heart;

  if (document.getElementById('screen-preferiti').classList.contains('active')) renderFav();
}

/* ── Screen navigation ── */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  if (name === 'mappa' && mainMap) setTimeout(() => mainMap.invalidateSize(), 60);
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

  document.getElementById('back-from-zona').addEventListener('click', () => showScreen('scopri'));
  document.getElementById('back-from-detail').addEventListener('click', () => {
    const from = previousScreen;
    showScreen(from);
    if (from === 'preferiti') renderFav();
  });
}

/* ── Search ── */
function bindSearch() {
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderScopri();
  });
}

/* ── Filter drawer ── */
function buildDrawerZones() {
  const list = document.getElementById('drawer-zone-list');
  list.innerHTML = '';

  const allItem = document.createElement('div');
  allItem.className = 'drawer-item';
  allItem.innerHTML = `<span>Tutte le zone</span>${!filterZona ? '<span class="drawer-check">✓</span>' : ''}`;
  allItem.addEventListener('click', () => { filterZona = null; closeDrawer(); renderScopri(); });
  list.appendChild(allItem);

  const sep = document.createElement('div');
  sep.className = 'drawer-sep';
  list.appendChild(sep);

  Object.keys(ZONE_META).forEach(zona => {
    const item = document.createElement('div');
    item.className = 'drawer-item';
    item.innerHTML = `<span>${ZONE_META[zona].emoji} ${zona}</span>${filterZona === zona ? '<span class="drawer-check">✓</span>' : ''}`;
    item.addEventListener('click', () => { filterZona = zona; closeDrawer(); renderScopri(); });
    list.appendChild(item);
  });

  const clear = document.createElement('button');
  clear.className = 'drawer-clear';
  clear.textContent = 'Azzera tutti i filtri';
  clear.addEventListener('click', () => {
    filterZona = null; filterCat = null;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    closeDrawer(); renderScopri();
  });
  list.appendChild(clear);
}

function bindFilter() {
  document.getElementById('btn-filter').addEventListener('click', () => {
    buildDrawerZones();
    document.getElementById('filter-overlay').classList.remove('hidden');
    document.getElementById('filter-drawer').classList.remove('hidden');
  });
  document.getElementById('filter-overlay').addEventListener('click', closeDrawer);
}

function closeDrawer() {
  document.getElementById('filter-overlay').classList.add('hidden');
  document.getElementById('filter-drawer').classList.add('hidden');
}

/* ── Fallback data ── */
const FALLBACK_DATA = [
  { id:"el-brellin", name:"El Brellin", zona:"Navigli", categoria:"Osteria", address:"Vicolo dei Lavandai, 14", description:"Osteria storica milanese affacciata sul Naviglio Grande. Cucina tradizionale con risotto alla milanese e cotoletta.", latitude:45.4551, longitude:9.1730, priceRange:3, tags:["milanese","tradizionale","risotto"], instagramHandle:"elbrellin", websiteURL:"https://www.elbrellin.it", imageURL:null, isNew:false },
  { id:"mag-cafe", name:"Mag Café", zona:"Navigli", categoria:"Cocktail Bar", address:"Ripa di Porta Ticinese, 43", description:"Uno dei cocktail bar più amati dei Navigli. Ottimo per l'aperitivo e il dopocena.", latitude:45.4540, longitude:9.1721, priceRange:2, tags:["cocktail","gin","aperitivo"], instagramHandle:"magcafemilano", websiteURL:null, imageURL:null, isNew:false },
  { id:"upcycle", name:"Upcycle", zona:"Navigli", categoria:"Cocktail Bar", address:"Via Corsico, 8", description:"Cocktail bar sostenibile con ingredienti stagionali. Uno dei preferiti degli insider.", latitude:45.4555, longitude:9.1740, priceRange:2, tags:["sustainable","cocktail","insider"], instagramHandle:"upcyclemilano", websiteURL:null, imageURL:null, isNew:false },
  { id:"dry-milano", name:"Dry Milano", zona:"Brera", categoria:"Pizza", address:"Via Solferino, 33", description:"Cocktail bar e pizzeria gourmet che ha rivoluzionato Milano.", latitude:45.4737, longitude:9.1862, priceRange:2, tags:["pizza","cocktail","gourmet"], instagramHandle:"drymilano", websiteURL:"https://www.drymilano.it", imageURL:null, isNew:false },
  { id:"pisacco", name:"Pisacco", zona:"Brera", categoria:"Ristorante", address:"Via Solferino, 48", description:"Wine bar e ristorante nel cuore di Brera con oltre 300 etichette.", latitude:45.4740, longitude:9.1870, priceRange:3, tags:["wine","mediterraneo","raffinato"], instagramHandle:"pisaccomilano", websiteURL:null, imageURL:null, isNew:false },
  { id:"ceresio7", name:"Ceresio 7", zona:"Isola", categoria:"Rooftop", address:"Via Ceresio, 7", description:"Ristorante e piscina rooftop con vista panoramica su Milano.", latitude:45.4839, longitude:9.1857, priceRange:4, tags:["rooftop","piscina","vista"], instagramHandle:"ceresio7", websiteURL:"https://www.ceresio7.com", imageURL:null, isNew:false },
  { id:"frida", name:"Frida", zona:"Isola", categoria:"Aperitivo", address:"Via Antonio Pollaiuolo, 3", description:"Locale cult con cortile estivo. Aperitivo ricco e birra artigianale.", latitude:45.4855, longitude:9.1902, priceRange:1, tags:["aperitivo","cortile","isola"], instagramHandle:"fridaisola", websiteURL:null, imageURL:null, isNew:false },
  { id:"pave", name:"Pavé", zona:"NoLo", categoria:"Caffè", address:"Via Felice Casati, 27", description:"Pasticceria e caffetteria dal design curato. Croissant tra i migliori di Milano.", latitude:45.4802, longitude:9.2061, priceRange:2, tags:["pasticceria","colazione","design"], instagramHandle:"pavemilano", websiteURL:"https://www.pavemilano.com", imageURL:null, isNew:false },
  { id:"champagne-socialist", name:"Champagne Socialist", zona:"Porta Venezia", categoria:"Vineria", address:"Via Lecco, 3", description:"Wine bar naturale e informale. Vini da piccoli produttori.", latitude:45.4757, longitude:9.2068, priceRange:2, tags:["vino naturale","informale"], instagramHandle:"champagnesocialistmilano", websiteURL:null, imageURL:null, isNew:true },
  { id:"botanical-club", name:"The Botanical Club", zona:"Tortona", categoria:"Cocktail Bar", address:"Via Tortona, 33", description:"Distilleria e cocktail bar botanico. Producono gin artigianale in loco.", latitude:45.4560, longitude:9.1697, priceRange:3, tags:["gin","artigianale","botanico"], instagramHandle:"thebotanicalclub", websiteURL:null, imageURL:null, isNew:false },
  { id:"luini", name:"Luini", zona:"Duomo", categoria:"Street Food", address:"Via Santa Radegonda, 16", description:"Dal 1888 il panzerotto più famoso di Milano. Un must.", latitude:45.4662, longitude:9.1889, priceRange:1, tags:["panzerotto","storico","must"], instagramHandle:"luinimilano", websiteURL:"https://www.luini.it", imageURL:null, isNew:false },
  { id:"tokuyoshi", name:"Ristorante Tokuyoshi", zona:"Tortona", categoria:"Ristorante", address:"Via San Calocero, 3", description:"Una stella Michelin. Cucina italiana con sensibilità giapponese.", latitude:45.4573, longitude:9.1768, priceRange:4, tags:["michelin","fusion","fine dining"], instagramHandle:"tokuyoshiristorante", websiteURL:null, imageURL:null, isNew:false },
  { id:"birrificio-lambrate", name:"Birrificio Lambrate", zona:"Lambrate", categoria:"Aperitivo", address:"Via Adelchi, 5", description:"Il birrificio artigianale più storico di Milano, fondato nel 1996.", latitude:45.4787, longitude:9.2385, priceRange:1, tags:["birra artigianale","pub","storico"], instagramHandle:"birrificio_lambrate", websiteURL:null, imageURL:null, isNew:false },
  { id:"trattoria-milanese", name:"Trattoria Milanese", zona:"Duomo", categoria:"Osteria", address:"Via Santa Marta, 11", description:"Dal 1933, la trattoria più autentica del centro. Casoeula e ossobuco tradizionali.", latitude:45.4636, longitude:9.1856, priceRange:3, tags:["tradizionale","storico","casoeula"], instagramHandle:null, websiteURL:null, imageURL:null, isNew:false },
  { id:"lume", name:"LUME Milano", zona:"Tortona", categoria:"Ristorante", address:"Via Watt, 37", description:"Due stelle Michelin. Una delle esperienze gastronomiche più straordinarie di Milano.", latitude:45.4534, longitude:9.1673, priceRange:4, tags:["michelin","fine dining","italiano"], instagramHandle:"lumemilano", websiteURL:"https://www.lumemilano.com", imageURL:null, isNew:false }
];
