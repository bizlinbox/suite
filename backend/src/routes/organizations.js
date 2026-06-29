const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticate);

// GET / - list orgs (admin scoped; realistically one per user)
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, timezone, platform_name, platform_logo, enable_public_registration, created_at FROM organizations WHERE id = $1',
      [req.user.org_id]
    );
    res.json({ organizations: result.rows });
  } catch (err) {
    logger.error('List organizations error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, timezone, platform_name, platform_logo, enable_public_registration, created_at FROM organizations WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0 || result.rows[0].id !== req.user.org_id) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({ organization: result.rows[0] });
  } catch (err) {
    logger.error('Get organization error', err);
    next(err);
  }
});

// PUT /:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, timezone, platform_name, platform_logo, enable_public_registration } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await query(
      `UPDATE organizations
       SET name = $1,
           timezone = COALESCE($2, timezone),
           platform_name = COALESCE($3, platform_name),
           platform_logo = COALESCE($4, platform_logo),
           enable_public_registration = COALESCE($5, enable_public_registration)
       WHERE id = $6
       RETURNING id, name, timezone, platform_name, platform_logo, enable_public_registration, created_at`,
      [name, timezone, platform_name, platform_logo, enable_public_registration, req.params.id]
    );
    if (result.rows.length === 0 || result.rows[0].id !== req.user.org_id) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({ organization: result.rows[0] });
  } catch (err) {
    logger.error('Update organization error', err);
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM organizations WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0 || result.rows[0].id !== req.user.org_id) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({ message: 'Organization deleted' });
  } catch (err) {
    logger.error('Delete organization error', err);
    next(err);
  }
});

module.exports = router;
