import fastify from 'fastify';
import { itemRoutes } from './routes/items';
import { pokemonRoutes } from './routes/pokemon';
import { initializePokemonData } from './controllers/pokemon';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

const REST_PORT = 3000;
const EXTERNAL_PORT = process.env.PORT || REST_PORT;

const server = fastify();

server.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Test swagger',
      description: 'Testing the Fastify swagger API',
      version: '0.1.0',
    },
    servers: [
      {
        url: `http://localhost:${EXTERNAL_PORT}`,
        description: 'Development server',
      },
    ],
    externalDocs: {
      url: 'https://swagger.io',
      description: 'Find more info here',
    },
  },
});

server.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
});

server.register(itemRoutes);
server.register(pokemonRoutes);

// Initialize pokemon data before starting server
initializePokemonData()
  .then(() => {
    server.listen({ port: REST_PORT, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        server.log.error(err);
        process.exit(1);
      }
      // server.log.info(`Server listening at ${address}`);
      console.log(`Server listening at ${address}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize pokemon data:', error);
    process.exit(1);
  });
