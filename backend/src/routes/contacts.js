const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);

const CONTACT_COLUMNS = `id, org_id, name, phone, email, avatar_url,
    company, job_title, notes, birthday, language, tags,
    address, city, state, country, zip_code, created_at`;

// GET / - list contacts
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ${CONTACT_COLUMNS}
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
      `SELECT ${CONTACT_COLUMNS}
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

function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean).map((t) => t.trim());
  return tags.split(',').map((t) => t.trim()).filter(Boolean);
}

// POST /
router.post('/', async (req, res, next) => {
  try {
    const {
      name, phone, email, avatar_url,
      company, job_title, notes, birthday, language, tags,
      address, city, state, country, zip_code,
    } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone is required' });
    }
    const tagArray = parseTags(tags);
    const result = await query(
      `INSERT INTO contacts (
         org_id, name, phone, email, avatar_url,
         company, job_title, notes, birthday, language, tags,
         address, city, state, country, zip_code
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING ${CONTACT_COLUMNS}`,
      [
        req.user.org_id, name, phone, email, avatar_url,
        company, job_title, notes,
        birthday || null, language,
        tagArray,
        address, city, state, country, zip_code,
      ]
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
    const {
      name, phone, email, avatar_url,
      company, job_title, notes, birthday, language, tags,
      address, city, state, country, zip_code,
    } = req.body;
    const tagArray = tags !== undefined ? parseTags(tags) : undefined;
    const result = await query(
      `UPDATE contacts
       SET name         = COALESCE($1, name),
           phone        = COALESCE($2, phone),
           email        = COALESCE($3, email),
           avatar_url   = COALESCE($4, avatar_url),
           company      = COALESCE($5, company),
           job_title    = COALESCE($6, job_title),
           notes        = COALESCE($7, notes),
           birthday     = COALESCE($8, birthday),
           language     = COALESCE($9, language),
           tags         = COALESCE($10, tags),
           address      = COALESCE($11, address),
           city         = COALESCE($12, city),
           state        = COALESCE($13, state),
           country      = COALESCE($14, country),
           zip_code     = COALESCE($15, zip_code)
       WHERE id = $16 AND org_id = $17
       RETURNING ${CONTACT_COLUMNS}`,
      [
        name, phone, email, avatar_url,
        company, job_title, notes,
        birthday || null, language,
        tagArray,
        address, city, state, country, zip_code,
        req.params.id, req.user.org_id,
      ]
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
