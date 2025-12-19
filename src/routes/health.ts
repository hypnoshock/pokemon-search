import { FastifyInstance } from 'fastify';
import { getHealth } from '../controllers/health';

const healthResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    timestamp: { type: 'string' },
    uptime: { type: 'number' },
    service: { type: 'string' },
    version: { type: 'string' },
    pokemonCount: { type: 'number' },
  },
};

const getHealthOpts = {
  schema: {
    response: {
      200: healthResponseSchema,
    },
  },
  handler: getHealth,
};

export function healthRoutes(server: FastifyInstance, options: any, done: () => void) {
  server.get('/health', getHealthOpts);

  done();
}

