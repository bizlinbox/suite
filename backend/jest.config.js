module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/db/migrate.js', '!src/db/seed.js', '!src/index.js'],
  coverageDirectory: 'coverage',
};
