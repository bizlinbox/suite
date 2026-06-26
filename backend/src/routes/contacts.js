const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);

// GET / - list contacts
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, name, phone, email, avatar_url, created_at
       FROM contacts WHERE org_id = $1 ORDER BY created_at DESC`,
      [req.user.org_id]
    );
    res.json({ contacts: camelize(result.rows) });
  } catch (err) {
    logger.error('List contacts error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, name, phone, email, avatar_url, created_at
       FROM contacts WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ contact: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get contact error', err);
    next(err);
  }
});

// POST /
router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, avatar_url } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone is required' });
    }
    const result = await query(
      `INSERT INTO contacts (org_id, name, phone, email, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, org_id, name, phone, email, avatar_url, created_at`,
      [req.user.org_id, name, phone, email, avatar_url]
    );
    res.status(201).json({ contact: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Create contact error', err);
    next(err);
  }
});

// PUT /:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, phone, email, avatar_url } = req.body;
    const result = await query(
      `UPDATE contacts
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           email = COALESCE($3, email),
           avatar_url = COALESCE($4, avatar_url)
       WHERE id = $5 AND org_id = $6
       RETURNING id, org_id, name, phone, email, avatar_url, created_at`,
      [name, phone, email, avatar_url, req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ contact: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update contact error', err);
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM contacts WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    logger.error('Delete contact error', err);
    next(err);
  }
});

module.exports = router;
