const express = require('express');
const { query } = require('../db');
const { authenticate, resolveWabaAccount } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);
router.use(resolveWabaAccount);

// GET / - list conversations for org
router.get('/', async (req, res, next) => {
  try {
    const { status, assigned_to } = req.query;
    let sql = `SELECT c.id, c.org_id, c.contact_id, c.assigned_agent_id, c.status, c.last_message_at, c.created_at,
                      con.name as contact_name, con.phone as contact_phone,
                      u.name as assigned_agent_name
               FROM conversations c
               JOIN contacts con ON con.id = c.contact_id
               LEFT JOIN users u ON u.id = c.assigned_agent_id
               WHERE c.org_id = $1`;
    const params = [req.user.org_id];

    if (req.wabaAccountId) {
      sql += ` AND c.waba_account_id = $${params.length + 1}`;
      params.push(req.wabaAccountId);
    }

    if (status) {
      sql += ` AND c.status = $${params.length + 1}`;
      params.push(status);
    }
    if (assigned_to) {
      sql += ` AND c.assigned_agent_id = $${params.length + 1}`;
      params.push(assigned_to);
    }

    sql += ' ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC';

    const result = await query(sql, params);
    const conversations = camelize(result.rows).map((r) => ({
      ...r,
      unreadCount: 0,
      lastMessagePreview: '',
    }));
    res.json({ conversations });
  } catch (err) {
    logger.error('List conversations error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    let sql = `SELECT c.id, c.org_id, c.contact_id, c.assigned_agent_id, c.status, c.last_message_at, c.created_at,
                      con.name as contact_name, con.phone as contact_phone
               FROM conversations c
               JOIN contacts con ON con.id = c.contact_id
               WHERE c.id = $1 AND c.org_id = $2`;
    const params = [req.params.id, req.user.org_id];

    if (req.wabaAccountId) {
      sql += ` AND c.waba_account_id = $${params.length + 1}`;
      params.push(req.wabaAccountId);
    }

    const result = await query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get conversation error', err);
    next(err);
  }
});

// POST / - create conversation
router.post('/', async (req, res, next) => {
  try {
    const { contact_id, waba_account_id } = req.body;
    if (!contact_id) {
      return res.status(400).json({ error: 'contact_id is required' });
    }

    const contactCheck = await query(
      'SELECT id FROM contacts WHERE id = $1 AND org_id = $2',
      [contact_id, req.user.org_id]
    );
    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
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
      `INSERT INTO conversations (org_id, contact_id, status, waba_account_id)
       VALUES ($1, $2, 'open', $3)
       RETURNING id, org_id, contact_id, assigned_agent_id, status, last_message_at, created_at`,
      [req.user.org_id, contact_id, waba_account_id || null]
    );
    res.status(201).json({ conversation: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Create conversation error', err);
    next(err);
  }
});

// PATCH /:id/assign - assign agent
router.patch('/:id/assign', async (req, res, next) => {
  try {
    const { agent_id } = req.body;
    let sql = `UPDATE conversations
               SET assigned_agent_id = $1
               WHERE id = $2 AND org_id = $3`;
    const params = [agent_id || null, req.params.id, req.user.org_id];
    if (req.wabaAccountId) {
      sql += ` AND waba_account_id = $${params.length + 1}`;
      params.push(req.wabaAccountId);
    }
    sql += ` RETURNING id, org_id, contact_id, assigned_agent_id, status, last_message_at, created_at`;
    const result = await query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Assign conversation error', err);
    next(err);
  }
});

// PATCH /:id/status - update status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['open', 'closed', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    let sql = `UPDATE conversations
               SET status = $1
               WHERE id = $2 AND org_id = $3`;
    const params = [status, req.params.id, req.user.org_id];
    if (req.wabaAccountId) {
      sql += ` AND waba_account_id = $${params.length + 1}`;
      params.push(req.wabaAccountId);
    }
    sql += ` RETURNING id, org_id, contact_id, assigned_agent_id, status, last_message_at, created_at`;
    const result = await query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update conversation status error', err);
    next(err);
  }
});

// POST /:id/close - close conversation
router.post('/:id/close', async (req, res, next) => {
  try {
    let sql = `UPDATE conversations
               SET status = 'closed'
               WHERE id = $1 AND org_id = $2`;
    const params = [req.params.id, req.user.org_id];
    if (req.wabaAccountId) {
      sql += ` AND waba_account_id = $${params.length + 1}`;
      params.push(req.wabaAccountId);
    }
    sql += ` RETURNING id, org_id, contact_id, assigned_agent_id, status, last_message_at, created_at`;
    const result = await query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Close conversation error', err);
    next(err);
  }
});

module.exports = router;
