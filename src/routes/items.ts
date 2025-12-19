import { FastifyInstance, RouteHandler } from 'fastify';
import { getItem, getItems } from '../controllers/items';

const itemSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
  },
};

const getItemsOpts = {
  schema: {
    response: {
      200: {
        type: 'array',
        items: itemSchema,
      },
    },
  },
  handler: getItems,
};

const getItemOpts = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'number' },
      },
      required: ['id'],
    },
    response: {
      200: itemSchema,
      404: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
  },
  handler: getItem,
};

export function itemRoutes(server: FastifyInstance, options: any, done: () => void) {
  server.get('/items', getItemsOpts);

  server.get('/items/:id', getItemOpts);

  done();
}
