const API_URL = 'https://pokeapi.co/api/v2/pokemon';
const SEARCH_DEBOUNCE = 300;
const SEARCH_LIMIT = 30;

const state = {
  loaded: [],
  view: [],
  offset: 0,
  focusIndex: 0,
  isLoading: false,
  names: null,
};

/**
 * Fetches JSON from a URL, or null on error.
 * @param {string} url
 * @returns {Promise<any>}
 */
async function fetchJson(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Loads a page of detailed Pokémon and appends them to the store.
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array>}
 */
async function fetchPage(limit, offset) {
  const data = await fetchJson(`${API_URL}?limit=${limit}&offset=${offset}`);
  if (!data) return [];
  const detailed = await Promise.all(data.results.map((p) => fetchJson(p.url)));
  const clean = detailed.filter(Boolean);
  state.loaded = [...state.loaded, ...clean];
  return clean;
}

/**
 * Returns the type name of a Pokémon, or "default".
 * @param {object} pokemon
 * @returns {string}
 */
function typeOf(pokemon) {
  return pokemon.types[0]?.type.name || 'default';
}

/**
 * Whether the visitor prefers reduced motion.
 * @returns {boolean}
 */
function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns the animated sprite where available, else the static one.
 * @param {object} p
 * @returns {string}
 */
function spriteOf(p) {
  const animated = p.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default;
  return (animated && !reducedMotion()) ? animated : p.sprites.front_default;
}

/**
 * Builds the markup for one grid card.
 * @param {object} p
 * @returns {string}
 */
function cardMarkup(p) {
  return `
    <div class="pokemon-card bg_${typeOf(p)}" data-id="${p.id}">
      <img class="pokemon-card__sprite" src="${spriteOf(p)}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p>#${p.id}</p>
    </div>`;
}

/**
 * Renders a set of Pokémon as the current view and wires card clicks.
 * @param {Array} list
 */
function renderGrid(list) {
  state.view = list;
  const container = document.getElementById('pokemon-container');
  if (!list.length) {
    container.innerHTML = '<p class="empty">Keine Pokémon gefunden.</p>';
    return;
  }
  container.innerHTML = list.map(cardMarkup).join('');
  container.querySelectorAll('.pokemon-card').forEach((card) => {
    card.addEventListener('click', () => openDetail(Number(card.dataset.id)));
  });
}

/**
 * Builds one stat bar row.
 * @param {object} p
 * @param {string} key stat name in the API
 * @param {string} label German label
 * @returns {string}
 */
function statBar(p, key, label) {
  const value = p.stats.find((s) => s.stat.name === key)?.base_stat ?? 0;
  const percent = Math.min(100, Math.round((value / 180) * 100));
  return `
    <div class="stat">
      <span class="stat__label">${label}</span>
      <span class="stat__track"><span class="stat__fill" style="width:${percent}%"></span></span>
      <span class="stat__value">${value}</span>
    </div>`;
}

/**
 * Builds the stat block of the detail card.
 * @param {object} p
 * @returns {string}
 */
function statsMarkup(p) {
  return statBar(p, 'hp', 'KP') + statBar(p, 'attack', 'Angriff')
    + statBar(p, 'defense', 'Verteidigung') + statBar(p, 'speed', 'Initiative');
}

/**
 * Returns the artwork URL, falling back to the default sprite.
 * @param {object} p
 * @returns {string}
 */
function artOf(p) {
  return p.sprites.other['official-artwork'].front_default || p.sprites.front_default;
}

/**
 * Builds the inner markup for the focused detail card.
 * @param {object} p
 * @returns {string}
 */
function focusedMarkup(p) {
  return `
    <div class="card-header"><h2>${p.name}</h2><span>#${p.id}</span></div>
    <img class="focused__art" src="${artOf(p)}" alt="${p.name}">
    <div class="card-details">
      <p><strong>Typ:</strong> ${p.types.map((t) => t.type.name).join(', ')}</p>
      <p><strong>Höhe:</strong> ${(p.height / 10).toFixed(1)} m,
         <strong>Gewicht:</strong> ${(p.weight / 10).toFixed(1)} kg</p>
      ${statsMarkup(p)}
    </div>
    <button class="close-btn" type="button" aria-label="Schließen">X</button>
    <button class="nav-btn prev-btn" type="button" aria-label="Vorheriges">⬅</button>
    <button class="nav-btn next-btn" type="button" aria-label="Nächstes">➡</button>`;
}

/**
 * Fills the focused card element and wires its buttons.
 * @param {object} p
 */
function fillFocused(p) {
  const card = document.querySelector('.pokemon-card.focused');
  card.className = `pokemon-card focused bg_${typeOf(p)}`;
  card.innerHTML = focusedMarkup(p);
  card.querySelector('.close-btn').addEventListener('click', closeDetail);
  card.querySelector('.prev-btn').addEventListener('click', () => navigate(-1));
  card.querySelector('.next-btn').addEventListener('click', () => navigate(1));
}

/**
 * Opens the detail overlay for a Pokémon id within the current view.
 * @param {number} id
 */
function openDetail(id) {
  state.focusIndex = state.view.findIndex((p) => p.id === id);
  if (state.focusIndex < 0) return;
  const container = document.getElementById('pokemon-container');
  container.classList.add('show-overlay');
  document.body.style.overflow = 'hidden';
  const card = document.createElement('div');
  card.className = 'pokemon-card focused';
  container.appendChild(card);
  fillFocused(state.view[state.focusIndex]);
}

/** Closes the detail overlay. */
function closeDetail() {
  const container = document.getElementById('pokemon-container');
  container.classList.remove('show-overlay');
  document.body.style.overflow = 'auto';
  container.querySelector('.pokemon-card.focused')?.remove();
}

/**
 * Steps through the current view while the overlay is open.
 * @param {number} direction
 */
function navigate(direction) {
  const count = state.view.length;
  state.focusIndex = (state.focusIndex + direction + count) % count;
  fillFocused(state.view[state.focusIndex]);
}

/** Shows the loading overlay. */
function showSpinner() {
  document.getElementById('loading-screen').classList.remove('hidden');
}

/** Hides the loading overlay. */
function hideSpinner() {
  document.getElementById('loading-screen').classList.add('hidden');
}

/**
 * Reads the currently selected page size.
 * @returns {number}
 */
function currentLimit() {
  return Number(document.getElementById('filter').value);
}

/** Loads and renders the first page of Pokémon. */
async function loadInitial() {
  showSpinner();
  await fetchPage(currentLimit(), state.offset);
  hideSpinner();
  renderGrid(state.loaded.slice(0, currentLimit()));
}

/**
 * Returns the cached name list, fetching it once on first use.
 * @returns {Promise<Array>}
 */
async function getNames() {
  if (state.names) return state.names;
  const data = await fetchJson(`${API_URL}?limit=1000&offset=0`);
  state.names = data?.results ?? [];
  return state.names;
}

/**
 * Runs a name search and renders the matches.
 * @param {string} query
 */
async function runSearch(query) {
  if (query.length < 3) {
    renderGrid(state.loaded.slice(0, currentLimit()));
    return;
  }
  showSpinner();
  const names = await getNames();
  const hits = names.filter((p) => p.name.includes(query)).slice(0, SEARCH_LIMIT);
  const detailed = await Promise.all(hits.map((h) => fetchJson(h.url)));
  hideSpinner();
  renderGrid(detailed.filter(Boolean));
}

/** Ensures enough Pokémon are loaded, then renders the chosen amount. */
async function applyFilter() {
  const limit = currentLimit();
  showSpinner();
  if (state.loaded.length < limit) {
    await fetchPage(limit - state.loaded.length, state.loaded.length);
  }
  hideSpinner();
  renderGrid(state.loaded.slice(0, limit));
}

/** Loads the next page and appends it to the grid. */
async function loadMore() {
  if (state.isLoading) return;
  state.isLoading = true;
  showSpinner();
  state.offset += currentLimit();
  await fetchPage(currentLimit(), state.offset);
  hideSpinner();
  renderGrid(state.loaded);
  state.isLoading = false;
}

/**
 * Handles overlay keyboard control.
 * @param {KeyboardEvent} event
 */
function onKeydown(event) {
  if (!document.querySelector('.pokemon-card.focused')) return;
  if (event.key === 'Escape') closeDetail();
  if (event.key === 'ArrowLeft') navigate(-1);
  if (event.key === 'ArrowRight') navigate(1);
}

/** Wires all controls and loads the first page. */
function init() {
  let timer;
  const search = document.getElementById('search');
  search.addEventListener('input', (e) => {
    clearTimeout(timer);
    const query = e.target.value.trim().toLowerCase();
    timer = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE);
  });
  document.getElementById('filter').addEventListener('change', applyFilter);
  document.getElementById('load-more').addEventListener('click', loadMore);
  document.addEventListener('keydown', onKeydown);
  loadInitial();
}

document.addEventListener('DOMContentLoaded', init);
