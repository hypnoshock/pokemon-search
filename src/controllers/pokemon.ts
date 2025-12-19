import { RouteHandler, FastifyBaseLogger } from 'fastify';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

interface PokemonType {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

interface RawPokemon {
  id: number;
  name: string;
  sprites: {
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  stats: PokemonStat[];
  types: PokemonType[];
}

interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  'special-attack': number;
  'special-defense': number;
}

interface PokemonResponse {
  id: number;
  name: string;
  image: string;
  stats: PokemonStats;
  bst: number;
  price: number;
}

interface PokemonMap {
  [id: number]: RawPokemon;
}

interface PricesMap {
  [id: number]: number;
}

let pokemonMap: PokemonMap = {};
let pricesMap: PricesMap = {};

// Load all pokemon data during initialization
export async function initializePokemonData(logger: FastifyBaseLogger): Promise<void> {
  const pokemonDir = path.join(__dirname, '../../data/pokemon');
  const pricesFile = path.join(__dirname, '../../data/pokemon-prices.json');

  // Load all pokemon files (1.json to 1025.json)
  const pokemonFiles: RawPokemon[] = [];
  for (let id = 1; id <= 1025; id++) {
    try {
      const filePath = path.join(pokemonDir, `${id}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const pokemonData = JSON.parse(fileContent);

      // Extract only the needed fields
      const pokemon: RawPokemon = {
        id: pokemonData.id,
        name: pokemonData.name,
        sprites: pokemonData.sprites,
        stats: pokemonData.stats,
        types: pokemonData.types,
      };

      pokemonFiles.push(pokemon);
    } catch (error) {
      const err = error as Error;
      logger.error(
        {
          error: err.message,
          stack: err.stack,
          pokemonId: id,
          event: 'pokemon_load_failed',
        },
        `Failed to load pokemon ${id}`
      );
    }
  }

  // Create map keyed by ID
  pokemonMap = pokemonFiles.reduce((map, pokemon) => {
    map[pokemon.id] = pokemon;
    return map;
  }, {} as PokemonMap);

  // Load prices file
  try {
    const pricesContent = await fs.readFile(pricesFile, 'utf-8');
    const pricesArray = JSON.parse(pricesContent) as Array<{
      id: number;
      name: string;
      price: number;
    }>;

    // Convert array to map keyed by ID
    pricesMap = pricesArray.reduce((map, item) => {
      map[item.id] = item.price;
      return map;
    }, {} as PricesMap);
  } catch (error) {
    const err = error as Error;
    logger.warn(
      {
        error: err.message,
        event: 'prices_load_failed',
      },
      'pokemon-prices.json not found or invalid, using default price of 0'
    );
    // Initialize with default prices (0) for all pokemon
    for (let id = 1; id <= 1025; id++) {
      pricesMap[id] = 0;
    }
  }

  logger.info(
    {
      event: 'pokemon_data_loaded',
      count: Object.keys(pokemonMap).length,
    },
    `Loaded ${Object.keys(pokemonMap).length} pokemon`
  );
}

// Get the count of loaded pokemon
export function getPokemonCount(): number {
  return Object.keys(pokemonMap).length;
}

// Transform raw pokemon data to response format
function transformPokemon(rawPokemon: RawPokemon, price: number): PokemonResponse {
  // Transform stats array to object
  const statsObj: PokemonStats = {
    hp: 0,
    attack: 0,
    defense: 0,
    'special-attack': 0,
    'special-defense': 0,
  };

  let bst = 0;

  rawPokemon.stats.forEach((stat) => {
    const statName = stat.stat.name;
    const baseStat = stat.base_stat;
    bst += baseStat;

    if (statName === 'hp') {
      statsObj.hp = baseStat;
    } else if (statName === 'attack') {
      statsObj.attack = baseStat;
    } else if (statName === 'defense') {
      statsObj.defense = baseStat;
    } else if (statName === 'special-attack') {
      statsObj['special-attack'] = baseStat;
    } else if (statName === 'special-defense') {
      statsObj['special-defense'] = baseStat;
    }
  });

  return {
    id: rawPokemon.id,
    name: rawPokemon.name,
    image: rawPokemon.sprites.other['official-artwork'].front_default,
    stats: statsObj,
    bst,
    price,
  };
}

// Filter pokemon based on query parameters
function filterPokemon(pokemon: PokemonResponse, query: Record<string, string>): boolean {
  // Stat filters
  const statFilters = ['hp', 'attack', 'defense', 'special-attack', 'special-defense'];
  for (const stat of statFilters) {
    const minKey = `${stat}_min`;
    const maxKey = `${stat}_max`;
    const min = query[minKey] ? Number(query[minKey]) : undefined;
    const max = query[maxKey] ? Number(query[maxKey]) : undefined;

    if (min !== undefined && pokemon.stats[stat as keyof PokemonStats] < min) {
      return false;
    }
    if (max !== undefined && pokemon.stats[stat as keyof PokemonStats] > max) {
      return false;
    }
  }

  // Price filters
  const priceMin = query.price_min ? Number(query.price_min) : undefined;
  const priceMax = query.price_max ? Number(query.price_max) : undefined;
  if (priceMin !== undefined && pokemon.price < priceMin) {
    return false;
  }
  if (priceMax !== undefined && pokemon.price > priceMax) {
    return false;
  }

  // BST filters
  const bstMin = query.bst_min ? Number(query.bst_min) : undefined;
  const bstMax = query.bst_max ? Number(query.bst_max) : undefined;
  if (bstMin !== undefined && pokemon.bst < bstMin) {
    return false;
  }
  if (bstMax !== undefined && pokemon.bst > bstMax) {
    return false;
  }

  return true;
}

// Sort pokemon based on query parameters
function sortPokemon(
  pokemon: PokemonResponse[],
  sortField?: string,
  order?: string
): PokemonResponse[] {
  if (!sortField) {
    // Default: sort by ID
    return pokemon.sort((a, b) => a.id - b.id);
  }

  const isDesc = order === 'desc';
  const sorted = [...pokemon].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    if (sortField === 'bst') {
      aValue = a.bst;
      bValue = b.bst;
    } else if (sortField === 'price') {
      aValue = a.price;
      bValue = b.price;
    } else if (sortField in a.stats) {
      aValue = a.stats[sortField as keyof PokemonStats];
      bValue = b.stats[sortField as keyof PokemonStats];
    } else {
      // Default to ID if invalid sort field
      aValue = a.id;
      bValue = b.id;
    }

    return isDesc ? bValue - aValue : aValue - bValue;
  });

  return sorted;
}

// Build filters_applied object from query
function buildFiltersApplied(query: Record<string, string>): Record<string, number> {
  const filters: Record<string, number> = {};
  const statFilters = ['hp', 'attack', 'defense', 'special-attack', 'special-defense'];

  for (const stat of statFilters) {
    const minKey = `${stat}_min`;
    const maxKey = `${stat}_max`;
    if (query[minKey]) filters[minKey] = Number(query[minKey]);
    if (query[maxKey]) filters[maxKey] = Number(query[maxKey]);
  }

  if (query.price_min) filters.price_min = Number(query.price_min);
  if (query.price_max) filters.price_max = Number(query.price_max);
  if (query.bst_min) filters.bst_min = Number(query.bst_min);
  if (query.bst_max) filters.bst_max = Number(query.bst_max);

  return filters;
}

// Get all pokemon with filtering and sorting
export const getPokemon: RouteHandler = async (req, res) => {
  const query = req.query as Record<string, string>;

  // Transform all pokemon to response format
  const allPokemon = Object.values(pokemonMap).map((rawPokemon) => {
    const price = pricesMap[rawPokemon.id] ?? 0;
    return transformPokemon(rawPokemon, price);
  });

  // Apply filters
  const filtered = allPokemon.filter((pokemon) => filterPokemon(pokemon, query));

  // Apply sorting
  const sorted = sortPokemon(filtered, query.sort, query.order);

  // Apply pagination
  const limit = query.limit ? Number(query.limit) : 20;
  const offset = query.offset ? Number(query.offset) : 0;
  const paginated = sorted.slice(offset, offset + limit);

  // Build response
  const filtersApplied = buildFiltersApplied(query);
  const sortInfo = query.sort
    ? {
        field: query.sort,
        order: query.order || 'asc',
      }
    : undefined;

  res.send({
    data: paginated,
    count: paginated.length,
    offset,
    limit,
    filters_applied: filtersApplied,
    ...(sortInfo && { sort: sortInfo }),
  });
};

// Get pokemon by ID
export const getPokemonById: RouteHandler = async (req, res) => {
  const { id } = req.params as { id: string };
  const pokemonId = Number(id);

  if (isNaN(pokemonId)) {
    return res.status(400).send({ message: 'Invalid ID' });
  }

  const rawPokemon = pokemonMap[pokemonId];
  if (!rawPokemon) {
    return res.status(404).send({ message: 'Pokemon not found' });
  }

  const price = pricesMap[pokemonId] ?? 0;
  const pokemon = transformPokemon(rawPokemon, price);

  res.send(pokemon);
};

// Get pokemon by name
export const getPokemonByName: RouteHandler = async (req, res) => {
  const { name } = req.params as { name: string };
  const nameLower = name.toLowerCase();

  const rawPokemon = Object.values(pokemonMap).find((p) => p.name.toLowerCase() === nameLower);

  if (!rawPokemon) {
    return res.status(404).send({ message: 'Pokemon not found' });
  }

  const price = pricesMap[rawPokemon.id] ?? 0;
  const pokemon = transformPokemon(rawPokemon, price);

  res.send(pokemon);
};

// Get pokemon by ID or name (combined handler)
export const getPokemonByIdOrName: RouteHandler = async (req, res) => {
  const { identifier } = req.params as { identifier: string };
  const pokemonId = Number(identifier);

  // Check if identifier is numeric
  if (!isNaN(pokemonId)) {
    // Treat as ID
    const rawPokemon = pokemonMap[pokemonId];
    if (!rawPokemon) {
      return res.status(404).send({ message: 'Pokemon not found' });
    }

    const price = pricesMap[pokemonId] ?? 0;
    const pokemon = transformPokemon(rawPokemon, price);
    return res.send(pokemon);
  } else {
    // Treat as name
    const nameLower = identifier.toLowerCase();
    const rawPokemon = Object.values(pokemonMap).find((p) => p.name.toLowerCase() === nameLower);

    if (!rawPokemon) {
      return res.status(404).send({ message: 'Pokemon not found' });
    }

    const price = pricesMap[rawPokemon.id] ?? 0;
    const pokemon = transformPokemon(rawPokemon, price);
    return res.send(pokemon);
  }
};

// Get budget picks - pokemon ordered by BST/price (bang for buck)
export const getBudgetPicks: RouteHandler = async (req, res) => {
  const query = req.query as Record<string, string>;
  const budget = query.budget ? Number(query.budget) : undefined;

  // Transform all pokemon to response format
  const allPokemon = Object.values(pokemonMap).map((rawPokemon) => {
    const price = pricesMap[rawPokemon.id] ?? 0;
    return transformPokemon(rawPokemon, price);
  });

  // Filter by budget if provided
  let filtered = allPokemon;
  if (budget !== undefined && !isNaN(budget)) {
    filtered = allPokemon.filter((pokemon) => pokemon.price <= budget);
  }

  // Sort by BST/price (descending - highest value first)
  // Handle division by zero: if price is 0, treat as Infinity (infinite value)
  const sorted = [...filtered].sort((a, b) => {
    const aRatio = a.price > 0 ? a.bst / a.price : Infinity;
    const bRatio = b.price > 0 ? b.bst / b.price : Infinity;
    return bRatio - aRatio; // Descending order
  });

  // Apply pagination
  const limit = query.limit ? Number(query.limit) : 20;
  const offset = query.offset ? Number(query.offset) : 0;
  const paginated = sorted.slice(offset, offset + limit);

  // Build response
  const filtersApplied: Record<string, number> = {};
  if (budget !== undefined && !isNaN(budget)) {
    filtersApplied.budget = budget;
  }

  res.send({
    data: paginated,
    count: paginated.length,
    offset,
    limit,
    filters_applied: filtersApplied,
    sort: {
      field: 'bst/price',
      order: 'desc',
    },
  });
};
