const fs = require('fs');
const path = require('path');
const { pool } = require('./index');
const logger = require('../utils/logger');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    logger.info('Database migration completed successfully');
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
