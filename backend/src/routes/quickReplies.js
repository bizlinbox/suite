const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);

// GET / - list quick replies for org
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, shortcut, content, message_type, metadata, created_at
       FROM quick_responses WHERE org_id = $1 ORDER BY created_at DESC`,
      [req.user.org_id]
    );
    res.json({ quickReplies: camelize(result.rows) });
  } catch (err) {
    logger.error('List quick replies error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, shortcut, content, message_type, metadata, created_at
       FROM quick_responses WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quick reply not found' });
    }
    res.json({ quickReply: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get quick reply error', err);
    next(err);
  }
});

// POST /
router.post('/', async (req, res, next) => {
  try {
    const { shortcut, content, messageType, metadata } = req.body;
    if (!shortcut || !content) {
      return res.status(400).json({ error: 'shortcut and content are required' });
    }
    const mt = messageType || 'text';
    const meta = metadata ? JSON.stringify(metadata) : '{}';
    const result = await query(
      `INSERT INTO quick_responses (org_id, shortcut, content, message_type, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, org_id, shortcut, content, message_type, metadata, created_at`,
      [req.user.org_id, shortcut, content, mt, meta]
    );
    res.status(201).json({ quickReply: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Create quick reply error', err);
    next(err);
  }
});

// PUT /:id
router.put('/:id', async (req, res, next) => {
  try {
    const { shortcut, content, messageType, metadata } = req.body;
    const meta = metadata ? JSON.stringify(metadata) : undefined;
    const result = await query(
      `UPDATE quick_responses
       SET shortcut = COALESCE($1, shortcut),
           content = COALESCE($2, content),
           message_type = COALESCE($3, message_type),
           metadata = COALESCE($4, metadata)
       WHERE id = $5 AND org_id = $6
       RETURNING id, org_id, shortcut, content, message_type, metadata, created_at`,
      [shortcut, content, messageType, meta, req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quick reply not found' });
    }
    res.json({ quickReply: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update quick reply error', err);
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM quick_responses WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quick reply not found' });
    }
    res.json({ message: 'Quick reply deleted' });
  } catch (err) {
    logger.error('Delete quick reply error', err);
    next(err);
  }
});

module.exports = router;
