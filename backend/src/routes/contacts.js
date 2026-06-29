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

// POST /bulk
router.post('/bulk', async (req, res, next) => {
  try {
    const { contacts: bulkContacts } = req.body;
    if (!Array.isArray(bulkContacts)) {
      return res.status(400).json({ error: 'contacts array is required' });
    }
    if (bulkContacts.length === 0) {
      return res.status(400).json({ error: 'contacts array cannot be empty' });
    }
    if (bulkContacts.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 contacts per bulk import' });
    }

    const results = { total: bulkContacts.length, created: 0, updated: 0, errors: 0, details: [] };

    for (const item of bulkContacts) {
      const {
        name, phone, email, avatar_url,
        company, job_title, notes, birthday, language, tags,
        address, city, state, country, zip_code,
      } = item;

      if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
        results.errors++;
        results.details.push({ phone: phone || null, status: 'error', message: 'Phone is required' });
        continue;
      }

      const trimmedPhone = phone.trim();
      const tagArray = parseTags(tags);

      try {
        const existsResult = await query(
          'SELECT id FROM contacts WHERE org_id = $1 AND phone = $2',
          [req.user.org_id, trimmedPhone]
        );
        const exists = existsResult.rows.length > 0;

        await query(
          `INSERT INTO contacts (
             org_id, name, phone, email, avatar_url,
             company, job_title, notes, birthday, language, tags,
             address, city, state, country, zip_code
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (org_id, phone)
           DO UPDATE SET
             name       = COALESCE(EXCLUDED.name, contacts.name),
             email      = COALESCE(EXCLUDED.email, contacts.email),
             avatar_url = COALESCE(EXCLUDED.avatar_url, contacts.avatar_url),
             company    = COALESCE(EXCLUDED.company, contacts.company),
             job_title  = COALESCE(EXCLUDED.job_title, contacts.job_title),
             notes      = COALESCE(EXCLUDED.notes, contacts.notes),
             birthday   = COALESCE(EXCLUDED.birthday, contacts.birthday),
             language   = COALESCE(EXCLUDED.language, contacts.language),
             tags       = COALESCE(EXCLUDED.tags, contacts.tags),
             address    = COALESCE(EXCLUDED.address, contacts.address),
             city       = COALESCE(EXCLUDED.city, contacts.city),
             state      = COALESCE(EXCLUDED.state, contacts.state),
             country    = COALESCE(EXCLUDED.country, contacts.country),
             zip_code   = COALESCE(EXCLUDED.zip_code, contacts.zip_code)`,
          [
            req.user.org_id, name || null, trimmedPhone, email || null, avatar_url || null,
            company || null, job_title || null, notes || null,
            birthday || null, language || null,
            tagArray,
            address || null, city || null, state || null, country || null, zip_code || null,
          ]
        );

        if (exists) {
          results.updated++;
          results.details.push({ phone: trimmedPhone, status: 'updated' });
        } else {
          results.created++;
          results.details.push({ phone: trimmedPhone, status: 'created' });
        }
      } catch (rowErr) {
        results.errors++;
        results.details.push({ phone: trimmedPhone, status: 'error', message: rowErr.message });
      }
    }

    res.json({ results });
  } catch (err) {
    logger.error('Bulk import contacts error', err);
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
