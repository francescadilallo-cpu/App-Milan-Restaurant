/* ── Data ── */
const DATA_URL = '../MilanoLocali/Resources/locali.json';

const ZONE_META = {
  'Navigli':      { emoji: '🌊' },
  'Brera':        { emoji: '🎨' },
  'Porta Venezia':{ emoji: '🌳' },
  'Isola':        { emoji: '🏝️' },
  'Tortona':      { emoji: '🏭' },
  'NoLo':         { emoji: '✨' },
  'Centrale':     { emoji: '🚉' },
  'Duomo':        { emoji: '⛪' },
  'Moscova':      { emoji: '🌿' },
  'Lambrate':     { emoji: '🍺' },
  'Città Studi':  { emoji: '📚' },
  'Loreto':       { emoji: '🔵' },
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

const PRICE_SYMBOLS = ['', '€', '€€', '€€€', '€€€€'];

/* ── State ── */
let allLocali = [];
let filterZona = null;
let filterCat = null;
let searchQuery = '';
let favorites = new Set(JSON.parse(localStorage.getItem('fav') || '[]'));
let detailMap = null;
let mainMap = null;
let mainMarkers = [];
let currentDetailLocale = null;
let previousScreen = 'scopri';

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(DATA_URL);
    allLocali = await res.json();
  } catch {
    // fallback inline sample if fetch fails on file://
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

/* ── Filtering ── */
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

/* ── Scopri screen ── */
function renderScopri() {
  const locali = filtered();
  const byZona = {};
  locali.forEach(l => { (byZona[l.zona] = byZona[l.zona] || []).push(l); });

  const grid = document.getElementById('zone-grid');
  grid.innerHTML = '';

  const zones = Object.entries(byZona).sort((a, b) => a[0].localeCompare(b[0]));
  if (zones.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--label3);padding:40px 0">Nessun risultato</p>';
    return;
  }

  zones.forEach(([zona, items]) => {
    const meta = ZONE_META[zona] || { emoji: '📍' };
    const card = document.createElement('div');
    card.className = 'zone-card';
    card.innerHTML = `
      <div class="zone-emoji">${meta.emoji}</div>
      <div class="zone-name">${zona}</div>
      <div class="zone-count"><span>${items.length}</span> ${items.length === 1 ? 'locale' : 'locali'}</div>
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
    chip.textContent = `${emoji} ${name}`;
    chip.addEventListener('click', () => {
      filterCat = filterCat === name ? null : name;
      document.querySelectorAll('.cat-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.cat === filterCat)
      );
      renderScopri();
      if (document.getElementById('screen-mappa').classList.contains('active')) renderMapMarkers();
    });
    bar.appendChild(chip);
  });
}

/* ── Zona list screen ── */
function showZona(zona) {
  previousScreen = 'scopri';
  const locali = filtered().filter(l => l.zona === zona);
  const meta = ZONE_META[zona] || { emoji: '📍' };
  document.getElementById('zona-title').textContent = `${meta.emoji} ${zona}`;
  document.getElementById('back-zona-label').textContent = 'Scopri';

  const list = document.getElementById('zona-list');
  list.innerHTML = '';
  locali.forEach(l => list.appendChild(makeLocaleItem(l, () => showDetail(l, 'zona'))));

  showScreen('zona');
}

function makeLocaleItem(l, onClick) {
  const isFav = favorites.has(l.id);
  const emoji = CAT_META[l.categoria] || '🍽️';
  const div = document.createElement('div');
  div.className = 'locale-item';
  div.innerHTML = `
    <div class="locale-item-body">
      <div class="locale-item-top">
        <span class="locale-item-name">${l.name}</span>
        ${l.isNew ? '<span class="badge-new">NUOVO</span>' : ''}
      </div>
      <div class="locale-item-sub">
        <span class="cat-badge">${emoji} ${l.categoria}</span>
        <span class="price-badge">${PRICE_SYMBOLS[l.priceRange] || ''}</span>
      </div>
      <div class="locale-address">${l.address}</div>
    </div>
    <div class="locale-item-actions">
      <button class="fav-btn" data-id="${l.id}" title="Preferito">${isFav ? '❤️' : '🤍'}</button>
      <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  `;
  div.querySelector('.locale-item-body').addEventListener('click', onClick);
  div.querySelector('.fav-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleFav(l.id, e.currentTarget);
  });
  return div;
}

/* ── Detail screen ── */
function showDetail(l, from) {
  previousScreen = from;
  currentDetailLocale = l;
  const emoji = CAT_META[l.categoria] || '🍽️';
  const isFav = favorites.has(l.id);

  document.getElementById('detail-body').innerHTML = `
    <div class="detail-header">
      <div>
        <div class="detail-name">${l.name}</div>
        <div class="detail-sub">${l.zona} · ${l.categoria} · ${PRICE_SYMBOLS[l.priceRange] || ''}</div>
      </div>
      <button class="detail-fav-btn" id="detail-fav-btn">${isFav ? '❤️' : '🤍'}</button>
    </div>
    ${(l.tags || []).length ? `
    <div class="tag-scroll">
      ${l.tags.map(t => `<span class="tag-chip">#${t}</span>`).join('')}
    </div>` : ''}
    <p class="detail-desc">${l.description}</p>
    <div class="detail-sep"></div>
    <div class="info-row"><span class="info-icon">📍</span><span class="info-text">${l.address}</span></div>
    ${l.instagramHandle ? `<div class="info-row"><span class="info-icon">📸</span><span class="info-text"><a href="https://instagram.com/${l.instagramHandle}" target="_blank">@${l.instagramHandle}</a></span></div>` : ''}
    ${l.websiteURL ? `<div class="info-row"><span class="info-icon">🌐</span><span class="info-text"><a href="${l.websiteURL}" target="_blank">${l.websiteURL}</a></span></div>` : ''}
    <button class="detail-maps-btn" id="detail-maps-btn">
      🗺️ Apri in Google Maps
    </button>
  `;

  document.getElementById('detail-fav-btn').addEventListener('click', e => {
    toggleFav(l.id, e.currentTarget);
  });
  document.getElementById('detail-maps-btn').addEventListener('click', () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}`;
    window.open(url, '_blank');
  });

  // Mini map
  setTimeout(() => {
    if (detailMap) { detailMap.remove(); detailMap = null; }
    detailMap = L.map('detail-map', { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false }).setView([l.latitude, l.longitude], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(detailMap);
    const icon = L.divIcon({ className: '', html: `<div class="map-marker">${emoji}</div>`, iconSize: [38, 38], iconAnchor: [19, 19] });
    L.marker([l.latitude, l.longitude], { icon }).addTo(detailMap);
    detailMap.invalidateSize();
  }, 50);

  showScreen('detail');
}

/* ── Map screen ── */
function initMainMap() {
  mainMap = L.map('main-map', { zoomControl: false, attributionControl: false }).setView([45.4654, 9.1859], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mainMap);
  L.control.zoom({ position: 'topright' }).addTo(mainMap);
  renderMapMarkers();
}

function renderMapMarkers() {
  mainMarkers.forEach(m => m.remove());
  mainMarkers = [];

  filtered().forEach(l => {
    const emoji = CAT_META[l.categoria] || '📍';
    const icon = L.divIcon({ className: '', html: `<div class="map-marker">${emoji}</div>`, iconSize: [38, 38], iconAnchor: [19, 38] });
    const marker = L.marker([l.latitude, l.longitude], { icon }).addTo(mainMap);
    marker.on('click', () => showMapSheet(l));
    mainMarkers.push(marker);
  });
}

function showMapSheet(l) {
  const emoji = CAT_META[l.categoria] || '🍽️';
  const isFav = favorites.has(l.id);
  const sheet = document.getElementById('map-sheet');
  document.getElementById('map-sheet-content').innerHTML = `
    <div class="sheet-name">${l.name}</div>
    <div class="sheet-sub">${l.zona} · ${emoji} ${l.categoria} · ${PRICE_SYMBOLS[l.priceRange] || ''}</div>
    <div class="sheet-desc">${l.description}</div>
    <div class="sheet-actions">
      <button class="sheet-detail-btn" id="sheet-detail-btn">Vedi dettagli →</button>
      <button class="sheet-fav-btn" id="sheet-fav-btn">${isFav ? '❤️' : '🤍'}</button>
    </div>
  `;
  sheet.classList.remove('hidden');

  document.getElementById('sheet-detail-btn').addEventListener('click', () => {
    sheet.classList.add('hidden');
    showDetail(l, 'mappa');
  });
  document.getElementById('sheet-fav-btn').addEventListener('click', e => {
    toggleFav(l.id, e.currentTarget);
  });
}

// close sheet on map click
document.addEventListener('click', e => {
  const sheet = document.getElementById('map-sheet');
  if (!sheet.classList.contains('hidden') && !sheet.contains(e.target) && !e.target.closest('.map-marker')) {
    sheet.classList.add('hidden');
  }
});

/* ── Preferiti screen ── */
function renderFav() {
  const favLocali = allLocali.filter(l => favorites.has(l.id));
  const list = document.getElementById('fav-list');
  const empty = document.getElementById('fav-empty');
  list.innerHTML = '';

  if (favLocali.length === 0) {
    empty.classList.remove('hidden');
    list.style.display = 'none';
  } else {
    empty.classList.add('hidden');
    list.style.display = '';
    favLocali.forEach(l => list.appendChild(makeLocaleItem(l, () => showDetail(l, 'preferiti'))));
  }
}

/* ── Favorites logic ── */
function toggleFav(id, btn) {
  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }
  localStorage.setItem('fav', JSON.stringify([...favorites]));

  // Update all hearts for this id
  document.querySelectorAll(`.fav-btn[data-id="${id}"]`).forEach(b => {
    b.textContent = favorites.has(id) ? '❤️' : '🤍';
  });
  if (btn.classList.contains('detail-fav-btn')) btn.textContent = favorites.has(id) ? '❤️' : '🤍';
  if (btn.classList.contains('sheet-fav-btn')) btn.textContent = favorites.has(id) ? '❤️' : '🤍';

  // Re-render fav screen if visible
  if (document.getElementById('screen-preferiti').classList.contains('active')) renderFav();
}

/* ── Screen navigation ── */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  // Resize map if needed
  if (name === 'mappa' && mainMap) setTimeout(() => mainMap.invalidateSize(), 50);
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

  document.getElementById('back-from-zona').addEventListener('click', () => {
    showScreen('scopri');
  });

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
  allItem.innerHTML = `<span>Tutte le zone</span>${!filterZona ? '<span class="check">✓</span>' : ''}`;
  allItem.addEventListener('click', () => { filterZona = null; closeDrawer(); renderScopri(); });
  list.appendChild(allItem);

  Object.keys(ZONE_META).forEach(zona => {
    const item = document.createElement('div');
    item.className = 'drawer-item';
    item.innerHTML = `<span>${ZONE_META[zona].emoji} ${zona}</span>${filterZona === zona ? '<span class="check">✓</span>' : ''}`;
    item.addEventListener('click', () => { filterZona = zona; closeDrawer(); renderScopri(); });
    list.appendChild(item);
  });

  const clearBtn = document.createElement('button');
  clearBtn.className = 'drawer-clear';
  clearBtn.textContent = 'Azzera filtri';
  clearBtn.addEventListener('click', () => { filterZona = null; filterCat = null; document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active')); closeDrawer(); renderScopri(); });
  list.appendChild(clearBtn);
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

/* ── Fallback data (used if fetch fails on file://) ── */
const FALLBACK_DATA = [
  { id:"el-brellin", name:"El Brellin", zona:"Navigli", categoria:"Osteria", address:"Vicolo dei Lavandai, 14", description:"Osteria storica milanese affacciata sul Naviglio Grande. Cucina tradizionale con risotto alla milanese e cotoletta.", latitude:45.4551, longitude:9.1730, priceRange:3, tags:["milanese","tradizionale","risotto"], instagramHandle:"elbrellin", websiteURL:"https://www.elbrellin.it", imageURL:null, isNew:false },
  { id:"mag-cafe", name:"Mag Café", zona:"Navigli", categoria:"Cocktail Bar", address:"Ripa di Porta Ticinese, 43", description:"Uno dei cocktail bar più amati dei Navigli. Ottimo per l'aperitivo e il dopocena.", latitude:45.4540, longitude:9.1721, priceRange:2, tags:["cocktail","gin","aperitivo"], instagramHandle:"magcafemilano", websiteURL:null, imageURL:null, isNew:false },
  { id:"dry-milano", name:"Dry Milano", zona:"Brera", categoria:"Pizza", address:"Via Solferino, 33", description:"Cocktail bar e pizzeria gourmet. Impasto a lunga lievitazione e farciture di qualità.", latitude:45.4737, longitude:9.1862, priceRange:2, tags:["pizza","cocktail","gourmet"], instagramHandle:"drymilano", websiteURL:"https://www.drymilano.it", imageURL:null, isNew:false },
  { id:"ceresio7", name:"Ceresio 7", zona:"Isola", categoria:"Rooftop", address:"Via Ceresio, 7", description:"Ristorante e piscina rooftop con vista panoramica su Milano.", latitude:45.4839, longitude:9.1857, priceRange:4, tags:["rooftop","piscina","vista"], instagramHandle:"ceresio7", websiteURL:"https://www.ceresio7.com", imageURL:null, isNew:false },
  { id:"pave", name:"Pavé", zona:"NoLo", categoria:"Caffè", address:"Via Felice Casati, 27", description:"Pasticceria e caffetteria dal design curato. Croissant e dolci artigianali tra i migliori di Milano.", latitude:45.4802, longitude:9.2061, priceRange:2, tags:["pasticceria","colazione","design"], instagramHandle:"pavemilano", websiteURL:"https://www.pavemilano.com", imageURL:null, isNew:false },
  { id:"luini", name:"Luini", zona:"Duomo", categoria:"Street Food", address:"Via Santa Radegonda, 16", description:"Dal 1888 il panzerotto più famoso di Milano. Un must assoluto.", latitude:45.4662, longitude:9.1889, priceRange:1, tags:["panzerotto","storico","street food"], instagramHandle:"luinimilano", websiteURL:"https://www.luini.it", imageURL:null, isNew:false },
  { id:"botanical-club", name:"The Botanical Club", zona:"Tortona", categoria:"Cocktail Bar", address:"Via Tortona, 33", description:"Distilleria e cocktail bar botanico. Producono gin artigianale in loco.", latitude:45.4560, longitude:9.1697, priceRange:3, tags:["gin","artigianale","botanico"], instagramHandle:"thebotanicalclub", websiteURL:null, imageURL:null, isNew:false },
  { id:"birrificio-lambrate", name:"Birrificio Lambrate", zona:"Lambrate", categoria:"Aperitivo", address:"Via Adelchi, 5", description:"Il birrificio artigianale più storico di Milano, fondato nel 1996.", latitude:45.4787, longitude:9.2385, priceRange:1, tags:["birra artigianale","pub","storico"], instagramHandle:"birrificio_lambrate", websiteURL:null, imageURL:null, isNew:false },
  { id:"champagne-socialist", name:"Champagne Socialist", zona:"Porta Venezia", categoria:"Vineria", address:"Via Lecco, 3", description:"Wine bar naturale e informale. Selezione di vini naturali da piccoli produttori.", latitude:45.4757, longitude:9.2068, priceRange:2, tags:["vino naturale","wine bar","informale"], instagramHandle:"champagnesocialistmilano", websiteURL:null, imageURL:null, isNew:true },
  { id:"pisacco", name:"Pisacco", zona:"Brera", categoria:"Ristorante", address:"Via Solferino, 48", description:"Wine bar e ristorante nel cuore di Brera. Oltre 300 etichette in carta.", latitude:45.4740, longitude:9.1870, priceRange:3, tags:["wine","mediterraneo","raffinato"], instagramHandle:"pisaccomilano", websiteURL:null, imageURL:null, isNew:false }
];
