# Pokemon search tool

A Node V24 TypeScript project built around the Fastify web framework. We are using the `swagger-ui` fastify plugin to provide a simple UI

## Running the project

### For development

```
nvm use
pnpm install
pnpm dev
```

This will run the project using `nodemon` serving the api on port 3000. A simple swagger frontend will be served on `http://localhost:3000/docs`

For use with the REST Client VSCode plugin, there is a `test.http` file that can be used to test queries

### Production

A dockerfile has been provided which is configured to expose port 3000. It can be run via the following commands

```
docker build -t pokemon-api .
docker run -p 3000:3000 pokemon-api
```

If you choose to use a different local port, you must provide a `PORT` env var with your local port in order for the swagger ui to know the correct endpoint

```
docker run -p 4000:3000 -e PORT=4000 node-template
```

## Overview

This project provides a REST api to allow users to search for pokemon.
Pokemon can be searched by:

`/pokemon` (retrieves all pokemon ordered by ID)
`/pokemon/:id` (retrieves a single pokemon by ID)
`/pokemon/:name` (retrieves a single pokemon by name)

### Query Parameters Pattern

For filtering by ranges, use suffix patterns:

{stat}\_min - minimum value (inclusive)
{stat}\_max - maximum value (inclusive)
price_min - minimum value (inclusive)
price_max - maximum value (inclusive)
bst_min - minimum value (inclusive)
bst_max - maximum value (inclusive)

For sorting:

sort - the stat field to sort by
order - either asc or desc (default to asc if omitted)

### An example of the response format

```
{
  "data": [
    {
      "id": 1,
      "name": "Example Pokemon",
      "image": "http://path-to-image.png"
      "stats": {
        "hp": 850,
        "attack": 145,
        "defense": 90,
        "special-attack": 150,
        "special-defense": 100,
      },
      "bst": 1335,
      "price": 1000
    }
  ],
  "count": 1,
  "filters_applied": {
    "atk_min": 100,
    "atk_max": 150
  },
  "sort": {
    "field": "attack",
    "order": "desc"
  }
}
```

## Project layout

data
├── pokemon
└── pokemon-prices.json
src
├── controllers
│ ├── health.ts
│ └── pokemon.ts
├── index.ts
└── routes
├── health.ts
└── pokemon.ts

The main entry point to the project is `src/index.ts`
Routes are registered as Fastify plugins and we have separated the routes and the controller logic to allow for the ability to easily switch controller logic e.g. if we would one day like to experiment with the pokemon being stored in a database.

## Pokemon data

The data for each of the 1025 pokemon is found in `data/pokemon` as a set of individual .json files named by id. They are all loaded upfront during initialisation phase and stored as objects keyed by ID in a map within `controller/pokemon.ts`

Each of the .json files contain superfluous data so each of the stored pokemon objects contain only a subset of this data:

```
id (number)
name (string)
sprites.other.official-artwork.front_default (string)
stats (array of stat objects)
types (array of type objects)

```

### example of stat object

```
{
  "base_stat": 45,
  "effort": 0,
  "stat": {
    "name": "hp",
    "url": "https://pokeapi.co/api/v2/stat/1/"
  }
}
```

### example of type object

```
{
  "slot": 1,
  "type": {
    "name": "grass",
    "url": "https://pokeapi.co/api/v2/type/12/"
  }
}
```

## Pokemon schema

The data served up over the REST api for each of the pokemon is a union of the data stored in the pokemon map (found in the pokemon.ts controller with data derived from the pokemon .json files), the price of the pokemon (`pokemon-prices.json`) and a pre-calculated BST rating

```
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
        'special-defense': { type: 'number' }
      }
    },
    bst: { type: 'number' },
    price: { type: 'number' }
  }
};

```
