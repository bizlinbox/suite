const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);

// GET / - list integrations for org
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, type, name, config, is_active, created_at, updated_at
       FROM integrations WHERE org_id = $1 ORDER BY created_at DESC`,
      [req.user.org_id]
    );
    res.json({ integrations: camelize(result.rows) });
  } catch (err) {
    logger.error('List integrations error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, type, name, config, is_active, created_at, updated_at
       FROM integrations WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    res.json({ integration: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get integration error', err);
    next(err);
  }
});

// POST /
router.post('/', async (req, res, next) => {
  try {
    const { type, name, config, is_active } = req.body;
    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'type is required' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!['webhook_forward'].includes(type)) {
      return res.status(400).json({ error: 'Invalid integration type' });
    }

    const result = await query(
      `INSERT INTO integrations (org_id, type, name, config, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, org_id, type, name, config, is_active, created_at, updated_at`,
      [req.user.org_id, type, name.trim(), JSON.stringify(config || {}), is_active !== false]
    );
    res.status(201).json({ integration: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Create integration error', err);
    next(err);
  }
});

// PUT /:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, config, is_active } = req.body;
    const result = await query(
      `UPDATE integrations
       SET name = COALESCE($1, name),
           config = COALESCE($2, config),
           is_active = COALESCE($3, is_active),
           updated_at = NOW()
       WHERE id = $4 AND org_id = $5
       RETURNING id, org_id, type, name, config, is_active, created_at, updated_at`,
      [name?.trim(), config !== undefined ? JSON.stringify(config) : null, is_active !== undefined ? is_active : null, req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    res.json({ integration: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update integration error', err);
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM integrations WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    res.json({ message: 'Integration deleted' });
  } catch (err) {
    logger.error('Delete integration error', err);
    next(err);
  }
});

module.exports = router;
