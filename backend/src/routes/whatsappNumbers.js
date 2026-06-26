const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);

// GET / - list WhatsApp numbers for org
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, phone_number_id, display_name, business_account_id, waba_account_id, is_active, created_at
       FROM whatsapp_numbers WHERE org_id = $1 ORDER BY created_at DESC`,
      [req.user.org_id]
    );
    const numbers = result.rows.map((r) => ({
      id: r.id,
      orgId: r.org_id,
      phoneNumberId: r.phone_number_id,
      displayName: r.display_name,
      businessAccountId: r.business_account_id,
      wabaAccountId: r.waba_account_id,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
    res.json({ whatsappNumbers: numbers });
  } catch (err) {
    logger.error('List WhatsApp numbers error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, phone_number_id, display_name, business_account_id, waba_account_id, is_active, created_at
       FROM whatsapp_numbers WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'WhatsApp number not found' });
    }
    res.json({ whatsappNumber: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get WhatsApp number error', err);
    next(err);
  }
});

// POST / - create WhatsApp number
router.post('/', async (req, res, next) => {
  try {
    const { phone_number_id, display_name, business_account_id, access_token, waba_account_id } = req.body;
    if (!phone_number_id || !access_token) {
      return res.status(400).json({ error: 'phone_number_id and access_token are required' });
    }

    if (waba_account_id) {
      const wabaCheck = await query(
        'SELECT id FROM waba_accounts WHERE id = $1 AND org_id = $2',
        [waba_account_id, req.user.org_id]
      );
      if (wabaCheck.rows.length === 0) {
        return res.status(404).json({ error: 'WABA account not found' });
      }
    }

    const result = await query(
      `INSERT INTO whatsapp_numbers (org_id, phone_number_id, display_name, business_account_id, access_token, waba_account_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, org_id, phone_number_id, display_name, business_account_id, waba_account_id, is_active, created_at`,
      [req.user.org_id, phone_number_id, display_name || null, business_account_id || null, access_token, waba_account_id || null]
    );
    res.status(201).json({ whatsappNumber: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Create WhatsApp number error', err);
    if (err.constraint === 'whatsapp_numbers_org_id_phone_number_id_key') {
      return res.status(409).json({ error: 'Phone number ID already exists for this organization' });
    }
    next(err);
  }
});

// PUT /:id - update
router.put('/:id', async (req, res, next) => {
  try {
    const { phone_number_id, display_name, business_account_id, access_token, is_active, waba_account_id } = req.body;

    const existing = await query(
      'SELECT id FROM whatsapp_numbers WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'WhatsApp number not found' });
    }

    if (waba_account_id) {
      const wabaCheck = await query(
        'SELECT id FROM waba_accounts WHERE id = $1 AND org_id = $2',
        [waba_account_id, req.user.org_id]
      );
      if (wabaCheck.rows.length === 0) {
        return res.status(404).json({ error: 'WABA account not found' });
      }
    }

    const result = await query(
      `UPDATE whatsapp_numbers
       SET phone_number_id = COALESCE($1, phone_number_id),
           display_name = COALESCE($2, display_name),
           business_account_id = COALESCE($3, business_account_id),
           access_token = COALESCE($4, access_token),
           is_active = COALESCE($5, is_active),
           waba_account_id = COALESCE($6, waba_account_id)
       WHERE id = $7 AND org_id = $8
       RETURNING id, org_id, phone_number_id, display_name, business_account_id, waba_account_id, is_active, created_at`,
      [phone_number_id, display_name, business_account_id, access_token, is_active, waba_account_id, req.params.id, req.user.org_id]
    );
    res.json({ whatsappNumber: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update WhatsApp number error', err);
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM whatsapp_numbers WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'WhatsApp number not found' });
    }
    res.json({ message: 'WhatsApp number deleted' });
  } catch (err) {
    logger.error('Delete WhatsApp number error', err);
    next(err);
  }
});

module.exports = router;
