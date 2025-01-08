const apiUrl = 'https://pokeapi.co/api/v2/pokemon';
let currentOffset = 0;
let limit = 20;

// Pokémon-Daten abrufen
async function fetchPokemons(limit, offset) {
    const response = await fetch(`${apiUrl}?limit=${limit}&offset=${offset}`);
    const data = await response.json();
    return data.results;
}

// Einzelne Pokémon-Details abrufen (für Bilder und andere Daten)
async function fetchPokemonDetails(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

// Pokémon-Karten rendern
async function renderPokemons(pokemons) {
    const container = document.getElementById('pokemon-container');
    container.innerHTML = ''; // Container leeren

    for (const pokemon of pokemons) {
        const details = await fetchPokemonDetails(pokemon.url);

        // Karte erstellen
        const card = document.createElement('div');
        const pokemonType = details.types[0]?.type.name || 'default'; // Nimm den ersten Typ oder 'default'
        card.className = `pokemon-card bg_${pokemonType}`;

        // Bild hinzufügen
        const img = document.createElement('img');
        img.src = details.sprites.front_default;
        img.alt = pokemon.name;
        card.appendChild(img);

        // Name hinzufügen
        const name = document.createElement('h3');
        name.textContent = pokemon.name;
        card.appendChild(name);

        // ID hinzufügen
        const id = document.createElement('p');
        id.textContent = `#${details.id}`;
        card.appendChild(id);

        // Karte zum Container hinzufügen
        container.appendChild(card);
    }
}

// Initial Pokémon laden
async function loadInitialPokemons() {
    const pokemons = await fetchPokemons(limit, currentOffset);
    await renderPokemons(pokemons);
}

// Suchfunktion
document.getElementById('search').addEventListener('input', async (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length < 2) return; // Mindestens 2 Buchstaben

    const pokemons = await fetchPokemons(100, 0); // Lade erste 100 Pokémon
    const filtered = pokemons.filter(pokemon => pokemon.name.includes(query));

    renderPokemons(filtered);
});

// Mehr laden
document.getElementById('load-more').addEventListener('click', async () => {
    currentOffset += limit;
    const pokemons = await fetchPokemons(limit, currentOffset);
    renderPokemons(pokemons);
});

// Filter für Anzahl
document.getElementById('filter').addEventListener('change', async (e) => {
    limit = parseInt(e.target.value);
    currentOffset = 0;
    loadInitialPokemons();
});

// Beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    loadInitialPokemons();
});
