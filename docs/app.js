const DATA_URL = 'https://raw.githubusercontent.com/francescadilallo-cpu/App-Milan-Restaurant/main/MilanoLocali/Resources/locali.json';

/* ── Zone config — color only, no emoji ── */
const ZONE_META = {
  'Navigli':       { color: '#4A9EBF' },
  'Brera':         { color: '#C4813A' },
  'Porta Venezia': { color: '#5B9E6B' },
  'Isola':         { color: '#3A7DC4' },
  'Tortona':       { color: '#8B5E9E' },
  'NoLo':          { color: '#D4607A' },
  'Centrale':      { color: '#5E7A9E' },
  'Duomo':         { color: '#B8963C' },
  'Moscova':       { color: '#4E9E7A' },
  'Lambrate':      { color: '#C4783A' },
  'Città Studi':   { color: '#7A5EC4' },
  'Loreto':        { color: '#3A9EC4' },
};

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
let searchQuery = '';
let favorites = new Set(JSON.parse(localStorage.getItem('mlFav') || '[]'));
let detailMap = null;
let mainMap   = null;
let mainMarkers = [];
let previousScreen = 'scopri';

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const r = await fetch(DATA_URL);
    if (r.ok) allLocali = await r.json(); else throw 0;
  } catch { allLocali = FALLBACK; }

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
    const color = (ZONE_META[zona]||{}).color || '#888';
    const card = document.createElement('div');
    card.className = 'zone-card';
    card.innerHTML = `
      <div class="zone-color-bar" style="background:${color}"></div>
      <div class="zone-name">${zona}</div>
      <div class="zone-count">
        <span class="zone-count-pill">${items.length}</span>
        ${items.length === 1 ? 'locale' : 'locali'}
      </div>`;
    card.addEventListener('click', () => showZona(zona));
    grid.appendChild(card);
  });
}

/* ── Category bar ── */
function buildCatBar() {
  const bar = document.getElementById('cat-bar');
  Object.entries(CAT_META).forEach(([name, meta]) => {
    const chip = document.createElement('button');
    chip.className = 'cat-chip';
    chip.dataset.cat = name;
    chip.textContent = name;
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
  document.getElementById('zona-title').textContent = zona;
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
  div.innerHTML = `
    <div class="locale-icon-wrap" style="background:${meta.color}18">${meta.icon.replace('currentColor', meta.color)}</div>
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
  div.querySelector('.locale-icon-wrap').addEventListener('click', onClick);
  div.querySelector('.fav-btn').addEventListener('click', e => { e.stopPropagation(); toggleFav(locale, e.currentTarget); });
  return div;
}

/* ── Detail ── */
function showDetail(locale, from) {
  previousScreen = from;
  const meta = CAT_META[locale.categoria] || { color:'#888', icon:'' };
  const isFav = favorites.has(locale.id);

  document.getElementById('detail-body').innerHTML = `
    <div class="detail-header">
      <div style="flex:1">
        <div class="detail-name">${locale.name}</div>
        <div class="detail-meta">
          <span class="cat-dot" style="background:${meta.color}"></span>
          <span class="detail-zona">${locale.zona}</span>
          <span class="meta-sep">·</span>
          <span class="detail-price">${PRICE[locale.priceRange]||''}</span>
        </div>
      </div>
      <button class="detail-fav-btn${isFav?' active':''}" id="d-fav">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFav?'currentColor':'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>
    ${(locale.tags||[]).length?`<div class="tag-row">${locale.tags.map(t=>`<span class="tag-chip">${t}</span>`).join('')}</div>`:''}
    <p class="detail-desc">${locale.description}</p>
    <div class="detail-card">
      <div class="info-row">
        <span class="info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
        <span class="info-text">${locale.address}</span>
      </div>
      ${locale.instagramHandle?`<div class="info-row">
        <span class="info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></span>
        <span class="info-text"><a href="https://instagram.com/${locale.instagramHandle}" target="_blank">@${locale.instagramHandle}</a></span>
      </div>`:''}
      ${locale.websiteURL?`<div class="info-row">
        <span class="info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
        <span class="info-text"><a href="${locale.websiteURL}" target="_blank">${locale.websiteURL.replace(/^https?:\/\//,'')}</a></span>
      </div>`:''}
    </div>
    <button class="detail-maps-btn" id="d-maps">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
      Apri in Maps
    </button>`;

  document.getElementById('d-fav').addEventListener('click', e => toggleFav(locale, e.currentTarget));
  document.getElementById('d-maps').addEventListener('click', () => window.open(`https://maps.apple.com/?q=${encodeURIComponent(locale.name)}&ll=${locale.latitude},${locale.longitude}`,'_blank'));

  setTimeout(() => {
    if (detailMap) { detailMap.remove(); detailMap = null; }
    detailMap = L.map('detail-map', { zoomControl:false, attributionControl:false, dragging:false, scrollWheelZoom:false, touchZoom:false })
      .setView([locale.latitude, locale.longitude], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(detailMap);
    const icon = L.divIcon({ className:'', html: makePin(meta.color), iconSize:[32,40], iconAnchor:[16,40] });
    L.marker([locale.latitude, locale.longitude], { icon }).addTo(detailMap);
    detailMap.invalidateSize();
  }, 60);

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
    filterZona = null; filterCat = null;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
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
  { id:"el-brellin", name:"El Brellin", zona:"Navigli", categoria:"Osteria", address:"Vicolo dei Lavandai, 14", description:"Osteria storica milanese affacciata sul Naviglio Grande. Cucina tradizionale con risotto alla milanese e cotoletta.", latitude:45.4551, longitude:9.1730, priceRange:3, tags:["milanese","tradizionale","risotto"], instagramHandle:"elbrellin", websiteURL:"https://www.elbrellin.it", isNew:false },
  { id:"mag-cafe", name:"Mag Café", zona:"Navigli", categoria:"Cocktail Bar", address:"Ripa di Porta Ticinese, 43", description:"Uno dei cocktail bar più amati dei Navigli. Ottimo per l'aperitivo e il dopocena.", latitude:45.4540, longitude:9.1721, priceRange:2, tags:["cocktail","gin","aperitivo"], instagramHandle:"magcafemilano", websiteURL:null, isNew:false },
  { id:"dry-milano", name:"Dry Milano", zona:"Brera", categoria:"Pizza", address:"Via Solferino, 33", description:"Cocktail bar e pizzeria gourmet che ha rivoluzionato Milano.", latitude:45.4737, longitude:9.1862, priceRange:2, tags:["pizza","cocktail","gourmet"], instagramHandle:"drymilano", websiteURL:"https://www.drymilano.it", isNew:false },
  { id:"ceresio7", name:"Ceresio 7", zona:"Isola", categoria:"Rooftop", address:"Via Ceresio, 7", description:"Ristorante e piscina rooftop con vista panoramica su Milano.", latitude:45.4839, longitude:9.1857, priceRange:4, tags:["rooftop","piscina","vista"], instagramHandle:"ceresio7", websiteURL:"https://www.ceresio7.com", isNew:false },
  { id:"pave", name:"Pavé", zona:"NoLo", categoria:"Caffè", address:"Via Felice Casati, 27", description:"Pasticceria e caffetteria dal design curato. Croissant tra i migliori di Milano.", latitude:45.4802, longitude:9.2061, priceRange:2, tags:["pasticceria","colazione","design"], instagramHandle:"pavemilano", websiteURL:"https://www.pavemilano.com", isNew:false },
  { id:"luini", name:"Luini", zona:"Duomo", categoria:"Street Food", address:"Via Santa Radegonda, 16", description:"Dal 1888 il panzerotto più famoso di Milano. Un must.", latitude:45.4662, longitude:9.1889, priceRange:1, tags:["panzerotto","storico","must"], instagramHandle:"luinimilano", websiteURL:"https://www.luini.it", isNew:false },
  { id:"botanical-club", name:"The Botanical Club", zona:"Tortona", categoria:"Cocktail Bar", address:"Via Tortona, 33", description:"Distilleria e cocktail bar botanico. Gin artigianale prodotto in loco.", latitude:45.4560, longitude:9.1697, priceRange:3, tags:["gin","artigianale","botanico"], instagramHandle:"thebotanicalclub", websiteURL:null, isNew:false },
  { id:"birrificio-lambrate", name:"Birrificio Lambrate", zona:"Lambrate", categoria:"Aperitivo", address:"Via Adelchi, 5", description:"Il birrificio artigianale più storico di Milano, fondato nel 1996.", latitude:45.4787, longitude:9.2385, priceRange:1, tags:["birra","pub","storico"], instagramHandle:"birrificio_lambrate", websiteURL:null, isNew:false },
  { id:"champagne-socialist", name:"Champagne Socialist", zona:"Porta Venezia", categoria:"Vineria", address:"Via Lecco, 3", description:"Wine bar naturale e informale. Selezione di vini da piccoli produttori.", latitude:45.4757, longitude:9.2068, priceRange:2, tags:["vino naturale","informale"], instagramHandle:"champagnesocialistmilano", websiteURL:null, isNew:true },
  { id:"pisacco", name:"Pisacco", zona:"Brera", categoria:"Ristorante", address:"Via Solferino, 48", description:"Wine bar e ristorante nel cuore di Brera con oltre 300 etichette.", latitude:45.4740, longitude:9.1870, priceRange:3, tags:["wine","mediterraneo"], instagramHandle:"pisaccomilano", websiteURL:null, isNew:false },
  { id:"lume", name:"LUME Milano", zona:"Tortona", categoria:"Ristorante", address:"Via Watt, 37", description:"Due stelle Michelin. Una delle esperienze gastronomiche più straordinarie di Milano.", latitude:45.4534, longitude:9.1673, priceRange:4, tags:["michelin","fine dining"], instagramHandle:"lumemilano", websiteURL:"https://www.lumemilano.com", isNew:false },
  { id:"trattoria-milanese", name:"Trattoria Milanese", zona:"Duomo", categoria:"Osteria", address:"Via Santa Marta, 11", description:"Dal 1933, la trattoria più autentica del centro. Casoeula e ossobuco tradizionali.", latitude:45.4636, longitude:9.1856, priceRange:3, tags:["tradizionale","storico"], instagramHandle:null, websiteURL:null, isNew:false },
  { id:"frida", name:"Frida", zona:"Isola", categoria:"Aperitivo", address:"Via Antonio Pollaiuolo, 3", description:"Locale cult con cortile estivo. Aperitivo ricco e birra artigianale.", latitude:45.4855, longitude:9.1902, priceRange:1, tags:["aperitivo","cortile"], instagramHandle:"fridaisola", websiteURL:null, isNew:false },
  { id:"ceresio-bar", name:"Bar Brera", zona:"Brera", categoria:"Caffè", address:"Via Brera, 23", description:"Caffè storico frequentato da artisti. Colazioni e aperitivi nell'atmosfera di Brera.", latitude:45.4733, longitude:9.1880, priceRange:2, tags:["storico","arte","aperitivo"], instagramHandle:null, websiteURL:null, isNew:false },
  { id:"moscova-bar", name:"Bar Moscova", zona:"Moscova", categoria:"Aperitivo", address:"Via Moscova, 32", description:"Classico bar milanese con dehors. Aperitivo con buffet generoso.", latitude:45.4769, longitude:9.1922, priceRange:2, tags:["aperitivo","dehors","buffet"], instagramHandle:null, websiteURL:null, isNew:false }
];
