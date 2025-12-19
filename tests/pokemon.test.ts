import { buildTestServer } from './helpers';

describe('Pokemon Endpoints', () => {
  let server: Awaited<ReturnType<typeof buildTestServer>>;

  beforeAll(async () => {
    server = await buildTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('GET /pokemon', () => {
    it('should return a list of pokemon', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('count');
      expect(body).toHaveProperty('offset');
      expect(body).toHaveProperty('limit');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.count).toBeGreaterThan(0);
    });

    it('should return pokemon with correct structure', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      if (body.data.length > 0) {
        const pokemon = body.data[0];
        expect(pokemon).toHaveProperty('id');
        expect(pokemon).toHaveProperty('name');
        expect(pokemon).toHaveProperty('image');
        expect(pokemon).toHaveProperty('stats');
        expect(pokemon).toHaveProperty('bst');
        expect(pokemon).toHaveProperty('price');
        expect(pokemon.stats).toHaveProperty('hp');
        expect(pokemon.stats).toHaveProperty('attack');
        expect(pokemon.stats).toHaveProperty('defense');
        expect(pokemon.stats).toHaveProperty('special-attack');
        expect(pokemon.stats).toHaveProperty('special-defense');
      }
    });

    it('should support pagination with limit', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon?limit=5',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeLessThanOrEqual(5);
      expect(body.limit).toBe(5);
    });

    it('should support pagination with offset', async () => {
      const response1 = await server.inject({
        method: 'GET',
        url: '/pokemon?limit=5&offset=0',
      });

      const response2 = await server.inject({
        method: 'GET',
        url: '/pokemon?limit=5&offset=5',
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);
      const body2 = JSON.parse(response2.body);
      expect(body1.data[0].id).not.toBe(body2.data[0].id);
    });

    it('should filter by attack_min', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon?attack_min=100',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      body.data.forEach((pokemon: any) => {
        expect(pokemon.stats.attack).toBeGreaterThanOrEqual(100);
      });
      if (body.filters_applied) {
        expect(body.filters_applied).toHaveProperty('attack_min', 100);
      }
    });

    it('should filter by attack_max', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon?attack_max=50',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      body.data.forEach((pokemon: any) => {
        expect(pokemon.stats.attack).toBeLessThanOrEqual(50);
      });
    });

    it('should filter by price_min and price_max', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon?price_min=100&price_max=1000',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      body.data.forEach((pokemon: any) => {
        expect(pokemon.price).toBeGreaterThanOrEqual(100);
        expect(pokemon.price).toBeLessThanOrEqual(1000);
      });
    });

    it('should filter by bst_min', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon?bst_min=500',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      body.data.forEach((pokemon: any) => {
        expect(pokemon.bst).toBeGreaterThanOrEqual(500);
      });
    });

    it('should sort by attack descending', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon?sort=attack&order=desc&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sort).toEqual({ field: 'attack', order: 'desc' });
      if (body.data.length > 1) {
        expect(body.data[0].stats.attack).toBeGreaterThanOrEqual(body.data[1].stats.attack);
      }
    });

    it('should sort by bst ascending', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon?sort=bst&order=asc&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sort).toEqual({ field: 'bst', order: 'asc' });
      if (body.data.length > 1) {
        expect(body.data[0].bst).toBeLessThanOrEqual(body.data[1].bst);
      }
    });

    it('should default to sorting by ID when no sort specified', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon?limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      if (body.data.length > 1) {
        expect(body.data[0].id).toBeLessThan(body.data[1].id);
      }
    });
  });

  describe('GET /pokemon/:identifier', () => {
    it('should return pokemon by ID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon/1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id', 1);
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('image');
      expect(body).toHaveProperty('stats');
      expect(body).toHaveProperty('bst');
      expect(body).toHaveProperty('price');
    });

    it('should return pokemon by name', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon/bulbasaur',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('name');
      expect(body.name.toLowerCase()).toBe('bulbasaur');
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon/99999',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('message', 'Pokemon not found');
    });

    it('should return 404 for non-existent name', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon/nonexistentpokemon',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('message', 'Pokemon not found');
    });

    it('should handle case-insensitive name lookup', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon/BULBASAUR',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name.toLowerCase()).toBe('bulbasaur');
    });
  });

  describe('GET /pokemon/budget-picks', () => {
    it('should return budget picks', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon/budget-picks',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('count');
      expect(body).toHaveProperty('sort');
      expect(body.sort).toEqual({ field: 'bst/price', order: 'desc' });
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter by budget when provided', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon/budget-picks?budget=500',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      body.data.forEach((pokemon: any) => {
        expect(pokemon.price).toBeLessThanOrEqual(500);
      });
      if (body.filters_applied) {
        expect(body.filters_applied).toHaveProperty('budget', 500);
      }
    });

    it('should sort by BST/price ratio (descending)', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/pokemon/budget-picks?limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      if (body.data.length > 1) {
        const first = body.data[0];
        const second = body.data[1];
        const firstRatio = first.price > 0 ? first.bst / first.price : Infinity;
        const secondRatio = second.price > 0 ? second.bst / second.price : Infinity;
        expect(firstRatio).toBeGreaterThanOrEqual(secondRatio);
      }
    });
  });
});
