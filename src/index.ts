import fastify from 'fastify';
import { itemRoutes } from './routes/items';
import { pokemonRoutes } from './routes/pokemon';
import { healthRoutes } from './routes/health';
import { initializePokemonData } from './controllers/pokemon';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

const REST_PORT = 3000;
const EXTERNAL_PORT = process.env.PORT || REST_PORT;

// Configure logger based on environment
const loggerConfig: any = {
  level: process.env.LOG_LEVEL || 'info',
};

// Only use pino-pretty in development
if (process.env.NODE_ENV === 'development') {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: { colorize: true },
  };
}

const server = fastify({
  logger: loggerConfig,
});

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

// server.register(itemRoutes);
server.register(pokemonRoutes);
server.register(healthRoutes);

// Add request logging hook
server.addHook('onRequest', async (request, reply) => {
  request.log.info(
    {
      method: request.method,
      url: request.url,
      query: request.query,
      ip: request.ip,
    },
    'Incoming request'
  );
});

// Add response logging hook
server.addHook('onResponse', async (request, reply) => {
  request.log.info(
    {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    },
    'Request completed'
  );
});

// Add error logging hook
server.setErrorHandler(async (error, request, reply) => {
  const err = error as Error & { statusCode?: number };
  request.log.error(
    {
      error: err.message,
      stack: err.stack,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode || err.statusCode || 500,
    },
    'Request error'
  );

  reply.status(err.statusCode || 500).send({
    error: err.message || 'Internal Server Error',
  });
});

// Initialize pokemon data before starting server
initializePokemonData(server.log)
  .then(() => {
    server.listen({ port: REST_PORT, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        server.log.error(
          {
            error: err.message,
            stack: err.stack,
          },
          'Failed to start server'
        );
        process.exit(1);
      }
      server.log.info(
        {
          event: 'server_start',
          port: REST_PORT,
          address,
          env: process.env.NODE_ENV || 'development',
        },
        'Server started'
      );
    });
  })
  .catch((error) => {
    const err = error as Error;
    server.log.error(
      {
        error: err.message,
        stack: err.stack,
        event: 'initialization_failed',
      },
      'Failed to initialize pokemon data'
    );
    process.exit(1);
  });
