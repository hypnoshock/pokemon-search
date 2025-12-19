import { RouteHandler } from 'fastify';
import { getPokemonCount } from './pokemon';

export const getHealth: RouteHandler = async (req, res) => {
  const pokemonCount = getPokemonCount();

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'stats-api',
    version: '1.0.0',
    pokemonCount,
  };
};

