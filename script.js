const apiUrl = 'https://pokeapi.co/api/v2/pokemon';
let allPokemons = []; // Lokale Speicherung aller Pokémon-Daten
let currentOffset = 0;
let limit = 20;
let isLoading = false; // Lade-Flag
let currentPokemonIndex = 0; // Index der aktuellen Karte

// Pokémon-Daten abrufen und speichern
async function fetchAndStorePokemons(limit, offset) {
    const response = await fetch(`${apiUrl}?limit=${limit}&offset=${offset}`);
    const data = await response.json();

    // Detaildaten abrufen und in `allPokemons` speichern
    const detailedPokemons = await Promise.all(
        data.results.map(pokemon => fetchPokemonDetails(pokemon.url))
    );
    allPokemons = [...allPokemons, ...detailedPokemons];
    return detailedPokemons;
}

// Einzelne Pokémon-Details abrufen
async function fetchPokemonDetails(url) {
    const response = await fetch(url);
    return response.json();
}

// Pokémon-Karten rendern
function renderPokemons(pokemons) {
    const container = document.getElementById('pokemon-container');
    container.innerHTML = pokemons
        .map(details => {
            const pokemonType = details.types[0]?.type.name || 'default';
            return `
                <div class="pokemon-card bg_${pokemonType}" 
                    data-id="${details.id}" 
                    data-name="${details.name}" 
                    data-image="${details.sprites.front_default}">
                    <img src="${details.sprites.front_default}" alt="${details.name}">
                    <h3>${details.name}</h3>
                    <p>#${details.id}</p>
                </div>
            `;
        })
        .join('');

    // Event-Listener für Karten hinzufügen
    container.querySelectorAll('.pokemon-card').forEach(card => {
        card.addEventListener('click', () => showPokemonDetails(card.dataset.id));
    });
}

// Hervorgehobene Karte anzeigen
function showPokemonDetails(id) {
    if (isLoading) return; // Blockiere, wenn bereits geladen wird
    isLoading = true;

    const container = document.getElementById('pokemon-container');
    currentPokemonIndex = allPokemons.findIndex(p => p.id === parseInt(id));
    const pokemon = allPokemons[currentPokemonIndex];
    if (!pokemon) {
        isLoading = false;
        return;
    }

    // Hintergrundabdunklung aktivieren
    container.classList.add('show-overlay');

    // Scrollen des Hintergrunds deaktivieren
    document.body.style.overflow = 'hidden';

    // Andere Karten abdunkeln
    const cards = container.querySelectorAll('.pokemon-card');
    cards.forEach(card => {
        card.classList.add('faded');
    });

    renderFocusedPokemon(pokemon);

    isLoading = false; // Ladezustand zurücksetzen
}

// Fokussierte Karte rendern
function renderFocusedPokemon(pokemon) {
    const container = document.getElementById('pokemon-container');
    const card = container.querySelector('.pokemon-card.focused') || document.createElement('div');
    card.className = 'pokemon-card focused';
    card.style.backgroundColor = getTypeColor(pokemon.types[0]?.type.name || 'default');
    card.innerHTML = `
        <div class="card-header">
            <h2>${pokemon.name}</h2>
            <span>#${pokemon.id}</span>
        </div>
        <img src="${pokemon.sprites.other['official-artwork'].front_default}" alt="${pokemon.name}">
        <div class="card-details">
            <p><strong>Typ:</strong> ${pokemon.types.map(t => t.type.name).join(', ')}</p>
            <p><strong>Höhe:</strong> ${(pokemon.height / 10).toFixed(1)} m</p>
            <p><strong>Gewicht:</strong> ${(pokemon.weight / 10).toFixed(1)} kg</p>
            <p><strong>Angriff:</strong> ${pokemon.stats.find(s => s.stat.name === 'attack').base_stat}</p>
            <p><strong>Verteidigung:</strong> ${pokemon.stats.find(s => s.stat.name === 'defense').base_stat}</p>
        </div>
        <button class="close-btn" onclick="closeDetails()">X</button>
        <button class="nav-btn prev-btn" onclick="navigatePokemon(-1)">⬅</button>
        <button class="nav-btn next-btn" onclick="navigatePokemon(1)">➡</button>
    `;
    container.appendChild(card);
}

// Navigation zwischen Karten
function navigatePokemon(direction) {
    currentPokemonIndex += direction;
    if (currentPokemonIndex < 0) currentPokemonIndex = allPokemons.length - 1;
    if (currentPokemonIndex >= allPokemons.length) currentPokemonIndex = 0;

    renderFocusedPokemon(allPokemons[currentPokemonIndex]);
}

// Detailansicht schließen
function closeDetails() {
    const container = document.getElementById('pokemon-container');
    container.classList.remove('show-overlay');

    // Scrollen des Hintergrunds wieder aktivieren
    document.body.style.overflow = 'auto';

    // Karten zurücksetzen
    const cards = container.querySelectorAll('.pokemon-card');
    cards.forEach(card => {
        card.classList.remove('faded', 'focused');
        card.style.backgroundColor = '';
        card.innerHTML = `
            <img src="${card.dataset.image}" alt="${card.dataset.name}">
            <h3>${card.dataset.name}</h3>
            <p>#${card.dataset.id}</p>
        `;
    });
}

// Funktion zur Rückgabe der Typfarbe
function getTypeColor(type) {
    const typeColors = {
        grass: 'green',
        fire: 'red',
        water: 'blue',
        electric: 'yellow',
        bug: 'limegreen',
        poison: 'purple',
        normal: 'gray',
        ground: 'brown',
        fairy: 'pink',
        fighting: 'darkred',
        psychic: 'violet',
        rock: 'darkgoldenrod',
        ghost: 'indigo',
        ice: 'lightblue',
        dragon: 'orange',
        steel: 'silver',
        dark: 'black',
        default: '#444'
    };
    return typeColors[type] || typeColors['default'];
}

// Initial Pokémon laden
async function loadInitialPokemons() {
    const pokemons = await fetchAndStorePokemons(limit, currentOffset);
    renderPokemons(pokemons);
}

// Suchfunktion
document.getElementById('search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length < 2) {
        renderPokemons(allPokemons); // Zeigt alle Pokémon
        return;
    }

    const filtered = allPokemons.filter(pokemon =>
        pokemon.name.toLowerCase().includes(query)
    );

    renderPokemons(filtered); // Gefilterte Pokémon anzeigen
});

// Mehr laden
document.getElementById('load-more').addEventListener('click', async () => {
    currentOffset += limit;

    const pokemons = await fetchAndStorePokemons(limit, currentOffset);
    renderPokemons(allPokemons);
});

// Beim Laden der Seite
document.addEventListener('DOMContentLoaded', loadInitialPokemons);
