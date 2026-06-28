// Test setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-long';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32chars-long!!';
process.env.DATABASE_URL = 'postgres://bizlinbox:bizlinbox@localhost:5432/bizlinbox_test';
process.env.REDIS_URL = 'redis://localhost:6379';
