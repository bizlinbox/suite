const fs = require('fs');
const path = require('path');
const { pool } = require('./index');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query('SELECT name FROM migrations ORDER BY name');
  return new Set(result.rows.map((r) => r.name));
}

async function bootstrapMigrationsTable(client) {
  // Detect existing database: if organizations table exists but migrations does not,
  // we bootstrap by marking all current migration files as already applied.
  const orgCheck = await client.query(`
    SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations'
  `);
  if (orgCheck.rows.length === 0) {
    return false; // Fresh database, no bootstrap needed
  }

  const migCheck = await client.query(`
    SELECT 1 FROM information_schema.tables WHERE table_name = 'migrations'
  `);
  if (migCheck.rows.length > 0) {
    return false; // Already has migrations table
  }

  logger.info('Bootstrapping migrations table for existing database');
  await ensureMigrationsTable(client);

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [file]
    );
  }
  logger.info(`Bootstrapped ${files.length} migrations as already applied`);
  return true;
}

async function migrate() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn('Migrations directory not found, skipping migrations');
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    logger.warn('No migration files found');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bootstrapped = await bootstrapMigrationsTable(client);
    if (!bootstrapped) {
      await ensureMigrationsTable(client);
    }

    const applied = await getAppliedMigrations(client);

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      logger.info(`Running migration: ${file}`);
      await client.query(sql);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      logger.info(`Migration completed: ${file}`);
    }

    await client.query('COMMIT');
    logger.info('Database migrations completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Database migration failed', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = migrate;

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
