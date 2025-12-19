import { FastifyInstance } from 'fastify';
import { getPokemon, getPokemonByIdOrName } from '../controllers/pokemon';

const pokemonSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    image: { type: 'string' },
    stats: {
      type: 'object',
      properties: {
        hp: { type: 'number' },
        attack: { type: 'number' },
        defense: { type: 'number' },
        'special-attack': { type: 'number' },
        'special-defense': { type: 'number' },
      },
    },
    bst: { type: 'number' },
    price: { type: 'number' },
  },
};

const pokemonListResponseSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: pokemonSchema,
    },
    count: { type: 'number' },
    filters_applied: {
      type: 'object',
      additionalProperties: { type: 'number' },
    },
    sort: {
      type: 'object',
      properties: {
        field: { type: 'string' },
        order: { type: 'string' },
      },
    },
  },
};

const getPokemonOpts = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        // Stat filters
        hp_min: { type: 'number' },
        hp_max: { type: 'number' },
        attack_min: { type: 'number' },
        attack_max: { type: 'number' },
        defense_min: { type: 'number' },
        defense_max: { type: 'number' },
        'special-attack_min': { type: 'number' },
        'special-attack_max': { type: 'number' },
        'special-defense_min': { type: 'number' },
        'special-defense_max': { type: 'number' },
        // Price filters
        price_min: { type: 'number' },
        price_max: { type: 'number' },
        // BST filters
        bst_min: { type: 'number' },
        bst_max: { type: 'number' },
        // Sorting
        sort: { type: 'string' },
        order: { type: 'string', enum: ['asc', 'desc'] },
      },
    },
    response: {
      200: pokemonListResponseSchema,
    },
  },
  handler: getPokemon,
};

const getPokemonByIdOrNameOpts = {
  schema: {
    params: {
      type: 'object',
      properties: {
        identifier: { type: 'string' },
      },
      required: ['identifier'],
    },
    response: {
      200: pokemonSchema,
      404: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
  },
  handler: getPokemonByIdOrName,
};

export function pokemonRoutes(server: FastifyInstance, options: any, done: () => void) {
  server.get('/pokemon', getPokemonOpts);
  // This route handles both /pokemon/:id and /pokemon/:name
  // The handler checks if the identifier is numeric (ID) or a string (name)
  server.get('/pokemon/:identifier', getPokemonByIdOrNameOpts);

  done();
}

