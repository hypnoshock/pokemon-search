import { buildTestServer } from './helpers';

describe('Health Endpoint', () => {
  let server: Awaited<ReturnType<typeof buildTestServer>>;

  beforeAll(async () => {
    server = await buildTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return health status', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('service', 'stats-api');
    expect(body).toHaveProperty('version', '1.0.0');
    expect(body).toHaveProperty('pokemonCount');
    expect(typeof body.pokemonCount).toBe('number');
    expect(body.pokemonCount).toBeGreaterThan(0);
  });

  it('should return a valid ISO timestamp', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const timestamp = new Date(body.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });
});

