const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);

// GET / - list canned responses for org
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, shortcut, content, created_at
       FROM canned_responses WHERE org_id = $1 ORDER BY created_at DESC`,
      [req.user.org_id]
    );
    res.json({ cannedResponses: camelize(result.rows) });
  } catch (err) {
    logger.error('List canned responses error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, shortcut, content, created_at
       FROM canned_responses WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Canned response not found' });
    }
    res.json({ cannedResponse: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get canned response error', err);
    next(err);
  }
});

// POST /
router.post('/', async (req, res, next) => {
  try {
    const { shortcut, content } = req.body;
    if (!shortcut || !content) {
      return res.status(400).json({ error: 'shortcut and content are required' });
    }
    const result = await query(
      `INSERT INTO canned_responses (org_id, shortcut, content)
       VALUES ($1, $2, $3)
       RETURNING id, org_id, shortcut, content, created_at`,
      [req.user.org_id, shortcut, content]
    );
    res.status(201).json({ cannedResponse: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Create canned response error', err);
    next(err);
  }
});

// PUT /:id
router.put('/:id', async (req, res, next) => {
  try {
    const { shortcut, content } = req.body;
    const result = await query(
      `UPDATE canned_responses
       SET shortcut = COALESCE($1, shortcut),
           content = COALESCE($2, content)
       WHERE id = $3 AND org_id = $4
       RETURNING id, org_id, shortcut, content, created_at`,
      [shortcut, content, req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Canned response not found' });
    }
    res.json({ cannedResponse: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update canned response error', err);
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM canned_responses WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Canned response not found' });
    }
    res.json({ message: 'Canned response deleted' });
  } catch (err) {
    logger.error('Delete canned response error', err);
    next(err);
  }
});

module.exports = router;
