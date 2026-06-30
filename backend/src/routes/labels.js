const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);

// GET / - list labels for org
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, name, color, created_at
       FROM labels WHERE org_id = $1 ORDER BY name ASC`,
      [req.user.org_id]
    );
    res.json({ labels: camelize(result.rows) });
  } catch (err) {
    logger.error('List labels error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, name, color, created_at
       FROM labels WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.json({ label: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get label error', err);
    next(err);
  }
});

// POST /
router.post('/', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const result = await query(
      `INSERT INTO labels (org_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING id, org_id, name, color, created_at`,
      [req.user.org_id, name.trim(), color || '#6B7280']
    );
    res.status(201).json({ label: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Create label error', err);
    next(err);
  }
});

// PUT /:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const result = await query(
      `UPDATE labels
       SET name = COALESCE($1, name),
           color = COALESCE($2, color)
       WHERE id = $3 AND org_id = $4
       RETURNING id, org_id, name, color, created_at`,
      [name?.trim(), color, req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.json({ label: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update label error', err);
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM labels WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.json({ message: 'Label deleted' });
  } catch (err) {
    logger.error('Delete label error', err);
    next(err);
  }
});

module.exports = router;
