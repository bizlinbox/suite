const { query } = require('./index');
const logger = require('../utils/logger');

const ALL_PERMISSIONS = [
  'conversations.read',
  'conversations.manage',
  'contacts.read',
  'contacts.manage',
  'campaigns.read',
  'campaigns.manage',
  'automations.read',
  'automations.manage',
  'analytics.read',
  'users.read',
  'users.manage',
  'roles.read',
  'roles.manage',
  'settings.read',
  'settings.manage',
];

const AGENT_PERMISSIONS = [
  'conversations.read',
  'conversations.manage',
  'contacts.read',
  'contacts.manage',
  'analytics.read',
  'settings.read',
];

async function seed() {
  try {
    // Backfill any WABA accounts that are missing phone_number_id
    const result = await query(
      `SELECT id, business_account_id, org_id FROM waba_accounts WHERE phone_number_id IS NULL`
    );

    for (const row of result.rows) {
      await query(
        `UPDATE waba_accounts SET phone_number_id = $1 WHERE id = $2`,
        [row.business_account_id, row.id]
      );
      logger.info(`Backfilled phone_number_id for WABA account ${row.id} in org ${row.org_id}`);
    }

    // Seed default roles for organizations that don't have them
    const orgs = await query(`SELECT id FROM organizations`);
    for (const org of orgs.rows) {
      const existingRoles = await query(
        `SELECT name FROM roles WHERE org_id = $1`,
        [org.id]
      );
      const existingNames = new Set(existingRoles.rows.map((r) => r.name));

      if (!existingNames.has('admin')) {
        await query(
          `INSERT INTO roles (org_id, name, permissions, is_system) VALUES ($1, $2, $3, true)`,
          [org.id, 'admin', JSON.stringify(ALL_PERMISSIONS)]
        );
        logger.info(`Created admin role for org ${org.id}`);
      }

      if (!existingNames.has('agent')) {
        await query(
          `INSERT INTO roles (org_id, name, permissions, is_system) VALUES ($1, $2, $3, true)`,
          [org.id, 'agent', JSON.stringify(AGENT_PERMISSIONS)]
        );
        logger.info(`Created agent role for org ${org.id}`);
      }
    }
  } catch (err) {
    logger.error('Seed error', err);
  }
}

module.exports = seed;

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
