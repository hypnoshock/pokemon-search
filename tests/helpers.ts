import fastify, { FastifyInstance } from 'fastify';
import { pokemonRoutes } from '../src/routes/pokemon';
import { healthRoutes } from '../src/routes/health';
import { initializePokemonData } from '../src/controllers/pokemon';

/**
 * Creates a test Fastify instance with all routes registered
 */
export async function buildTestServer(): Promise<FastifyInstance> {
  const server = fastify({
    logger: false, // Disable logging in tests
  });

  // Register routes
  await server.register(pokemonRoutes);
  await server.register(healthRoutes);

  // Initialize pokemon data
  await initializePokemonData(server.log);

  return server;
}

