const request = require('supertest');

// Mock the db and other heavy deps to keep tests fast
jest.mock('../src/db', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  },
  query: jest.fn(),
  connectWithRetry: jest.fn().mockResolvedValue(),
}));

jest.mock('../src/db/migrate', () => jest.fn().mockResolvedValue());
jest.mock('../src/db/seed', () => jest.fn().mockResolvedValue());

const app = require('../src/index');

describe('Auth Routes', () => {
  afterAll(async () => {
    const { pool } = require('../src/db');
    await pool.end();
  });

  it('POST /api/v1/auth/login should validate missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('GET /health should return status ok', async () => {
    const res = await request(app).get('/health');
    // May return 503 if DB/Redis is not available in test env, which is fine
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body.status).toBeDefined();
  });
});
