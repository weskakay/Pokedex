const apiUrl = 'https://pokeapi.co/api/v2/pokemon';
let allPokemons = [];
let currentOffset = 0;
let limit = 20;
let isLoading = false;
let currentPokemonIndex = 0;

async function fetchAndStorePokemons(limit, offset) {
    try {
        const response = await fetch(`${apiUrl}?limit=${limit}&offset=${offset}`);
        const data = await response.json();
        const detailedPokemons = await Promise.all(
            data.results.map(pokemon => fetchPokemonDetails(pokemon.url))
        );

        const newPokemons = detailedPokemons.filter(pokemon =>
            !allPokemons.some(existing => existing.id === pokemon.id)
        );

        allPokemons = [...allPokemons, ...newPokemons];
        return newPokemons;
    } catch (error) {
        console.error("Error fetching Pokémon data:", error);
        return [];
    }
}

async function fetchPokemonDetails(url) {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error("Error fetching Pokémon details:", error);
        return null;
    }
}

function generatePokemonCard(details) {
    const pokemonType = details.types[0]?.type.name || 'default';
    return `
        <div class="pokemon-card bg_${pokemonType}" data-id="${details.id}">
            <img src="${details.sprites.front_default}" alt="${details.name}">
            <h3>${details.name}</h3>
            <p>#${details.id}</p>
        </div>
    `;
}

function generateFocusedPokemonCard(pokemon) {
    const pokemonType = pokemon.types[0]?.type.name || 'default';
    return `
        <div class="pokemon-card focused" style="background-color: ${getTypeColor(pokemonType)};">
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
        </div>
    `;
}

function renderPokemons(pokemons) {
    const container = document.getElementById('pokemon-container');
    container.innerHTML = pokemons.map(generatePokemonCard).join('');
    container.querySelectorAll('.pokemon-card').forEach(card => {
        card.addEventListener('click', () => showPokemonDetails(card.dataset.id));
    });
}

function showPokemonDetails(id) {
    if (isLoading) return;
    isLoading = true;
    currentPokemonIndex = allPokemons.findIndex(p => p.id === parseInt(id));
    const pokemon = allPokemons[currentPokemonIndex];
    if (!pokemon) {
        isLoading = false;
        return;
    }
    const container = document.getElementById('pokemon-container');
    container.classList.add('show-overlay');
    document.body.style.overflow = 'hidden';

    renderFocusedPokemon(pokemon);
    isLoading = false;
}

function renderFocusedPokemon(pokemon) {
    const container = document.getElementById('pokemon-container');
    const focusedCard = document.createElement('div');
    focusedCard.innerHTML = generateFocusedPokemonCard(pokemon);
    container.appendChild(focusedCard);
}

function navigatePokemon(direction) {
    currentPokemonIndex = (currentPokemonIndex + direction + allPokemons.length) % allPokemons.length;
    const pokemon = allPokemons[currentPokemonIndex];
    const focusedCard = document.querySelector('.pokemon-card.focused');
    if (focusedCard) {
        focusedCard.innerHTML = generateFocusedPokemonCard(pokemon);
        focusedCard.style.backgroundColor = getTypeColor(pokemon.types[0]?.type.name || 'default');
    }
}

function closeDetails() {
    const container = document.getElementById('pokemon-container');
    container.classList.remove('show-overlay');
    document.body.style.overflow = 'auto';
    const focusedCard = container.querySelector('.pokemon-card.focused');
    if (focusedCard) focusedCard.remove();
}

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

async function loadInitialPokemons() {
    const pokemons = await fetchAndStorePokemons(limit, currentOffset);
    renderPokemons(pokemons);
}

document.getElementById('filter').addEventListener('change', async (e) => {
    const selectedLimit = parseInt(e.target.value, 10);

    if (allPokemons.length < selectedLimit) {
        await fetchAndStorePokemons(selectedLimit - allPokemons.length, currentOffset + allPokemons.length);
    }

    const pokemonsToRender = allPokemons.slice(0, selectedLimit);
    renderPokemons(pokemonsToRender);
});

document.getElementById('search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length < 3) {
        renderPokemons(allPokemons);
        return;
    }

    const filtered = allPokemons.filter(pokemon =>
        pokemon.name.toLowerCase().includes(query)
    );

    renderPokemons(filtered);
});

document.getElementById('load-more').addEventListener('click', async () => {
    const filter = document.getElementById('filter');
    const currentLimit = parseInt(filter.value, 10);
    currentOffset += currentLimit;
    const pokemons = await fetchAndStorePokemons(currentLimit, currentOffset);
    renderPokemons(allPokemons);
});


document.addEventListener('DOMContentLoaded', loadInitialPokemons);
