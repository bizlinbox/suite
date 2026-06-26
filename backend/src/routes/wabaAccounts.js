const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { query } = require('../db');
const { authenticate, requirePermission, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');
const config = require('../config');

const router = express.Router();

router.use(authenticate);

// GET / - list WABA accounts for org
router.get('/', async (req, res, next) => {
  try {
    const perms = req.user?.permissions || [];
    let sql = `SELECT id, org_id, name, phone_number_id, business_account_id, webhook_verify_token, is_active, created_at
               FROM waba_accounts
               WHERE org_id = $1`;
    const params = [req.user.org_id];

    if (!perms.includes('settings.manage')) {
      sql = `SELECT wa.id, wa.org_id, wa.name, wa.phone_number_id, wa.business_account_id, wa.webhook_verify_token, wa.is_active, wa.created_at
             FROM waba_accounts wa
             JOIN agent_waba_access awa ON awa.waba_account_id = wa.id
             WHERE wa.org_id = $1 AND awa.agent_id = $2`;
      params.push(req.user.id);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json({ wabaAccounts: camelize(result.rows) });
  } catch (err) {
    logger.error('List WABA accounts error', err);
    next(err);
  }
});

// GET /:id - get single WABA account
router.get('/:id', async (req, res, next) => {
  try {
    const perms = req.user?.permissions || [];
    let sql = `SELECT id, org_id, name, phone_number_id, business_account_id, webhook_verify_token, is_active, created_at
               FROM waba_accounts
               WHERE id = $1 AND org_id = $2`;
    const params = [req.params.id, req.user.org_id];

    if (!perms.includes('settings.manage')) {
      sql = `SELECT wa.id, wa.org_id, wa.name, wa.phone_number_id, wa.business_account_id, wa.webhook_verify_token, wa.is_active, wa.created_at
             FROM waba_accounts wa
             JOIN agent_waba_access awa ON awa.waba_account_id = wa.id
             WHERE wa.id = $1 AND wa.org_id = $2 AND awa.agent_id = $3`;
      params.push(req.user.id);
    }

    const result = await query(sql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }
    res.json({ wabaAccount: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get WABA account error', err);
    next(err);
  }
});

// POST / - create WABA account (settings.manage)
router.post('/', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const { name, phone_number_id, business_account_id, access_token } = req.body;
    if (!name || !phone_number_id || !business_account_id || !access_token) {
      return res.status(400).json({ error: 'name, phone_number_id, business_account_id, and access_token are required' });
    }

    const webhookVerifyToken = crypto.randomBytes(32).toString('hex');

    const result = await query(
      `INSERT INTO waba_accounts (org_id, name, phone_number_id, business_account_id, access_token, webhook_verify_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, org_id, name, phone_number_id, business_account_id, webhook_verify_token, is_active, created_at`,
      [req.user.org_id, name, phone_number_id, business_account_id, access_token, webhookVerifyToken]
    );
    res.status(201).json({ wabaAccount: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Create WABA account error', err);
    if (err.constraint === 'waba_accounts_org_id_business_account_id_key') {
      return res.status(409).json({ error: 'Business account ID already exists for this organization' });
    }
    if (err.constraint === 'waba_accounts_org_id_phone_number_id_key') {
      return res.status(409).json({ error: 'Phone number ID already exists for this organization' });
    }
    next(err);
  }
});

// PUT /:id - update WABA account (settings.manage)
router.put('/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const { name, phone_number_id, business_account_id, access_token, is_active } = req.body;

    const existing = await query(
      'SELECT id FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    const result = await query(
      `UPDATE waba_accounts
       SET name = COALESCE($1, name),
           phone_number_id = COALESCE($2, phone_number_id),
           business_account_id = COALESCE($3, business_account_id),
           access_token = COALESCE($4, access_token),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 AND org_id = $7
       RETURNING id, org_id, name, phone_number_id, business_account_id, is_active, created_at`,
      [name, phone_number_id, business_account_id, access_token, is_active, req.params.id, req.user.org_id]
    );
    res.json({ wabaAccount: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update WABA account error', err);
    next(err);
  }
});

// DELETE /:id - delete WABA account (settings.manage)
router.delete('/:id', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM waba_accounts WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }
    res.json({ message: 'WABA account deleted' });
  } catch (err) {
    logger.error('Delete WABA account error', err);
    next(err);
  }
});

// GET /:id/agents - list agents assigned to this WABA (settings.manage)
router.get('/:id/agents', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const wabaCheck = await query(
      'SELECT id FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (wabaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.status
       FROM users u
       JOIN agent_waba_access awa ON awa.agent_id = u.id
       WHERE awa.waba_account_id = $1
       ORDER BY u.name ASC`,
      [req.params.id]
    );
    res.json({ agents: camelize(result.rows) });
  } catch (err) {
    logger.error('List WABA agents error', err);
    next(err);
  }
});

// POST /:id/agents - assign agent(s) to WABA (settings.manage)
router.post('/:id/agents', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const { agent_ids } = req.body;
    if (!Array.isArray(agent_ids) || agent_ids.length === 0) {
      return res.status(400).json({ error: 'agent_ids array is required' });
    }

    const wabaCheck = await query(
      'SELECT id FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (wabaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    // Verify all agents belong to this org
    const agentCheck = await query(
      `SELECT id FROM users WHERE id = ANY($1::uuid[]) AND org_id = $2`,
      [agent_ids, req.user.org_id]
    );
    if (agentCheck.rows.length !== agent_ids.length) {
      return res.status(400).json({ error: 'One or more agent IDs are invalid or do not belong to this organization' });
    }

    // Insert, ignoring duplicates
    for (const agentId of agent_ids) {
      await query(
        `INSERT INTO agent_waba_access (agent_id, waba_account_id)
         VALUES ($1, $2)
         ON CONFLICT (agent_id, waba_account_id) DO NOTHING`,
        [agentId, req.params.id]
      );
    }

    res.status(201).json({ message: 'Agents assigned to WABA account' });
  } catch (err) {
    logger.error('Assign agents to WABA error', err);
    next(err);
  }
});

// DELETE /:id/agents/:agentId - remove agent access (settings.manage)
router.delete('/:id/agents/:agentId', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const wabaCheck = await query(
      'SELECT id FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (wabaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    const result = await query(
      'DELETE FROM agent_waba_access WHERE waba_account_id = $1 AND agent_id = $2 RETURNING id',
      [req.params.id, req.params.agentId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent access not found' });
    }
    res.json({ message: 'Agent access removed' });
  } catch (err) {
    logger.error('Remove agent WABA access error', err);
    next(err);
  }
});

// POST /test - test connection with provided credentials (before saving)
router.post('/test', async (req, res, next) => {
  try {
    const { business_account_id, access_token } = req.body;
    if (!business_account_id || !access_token) {
      return res.status(400).json({ error: 'business_account_id and access_token are required' });
    }

    try {
      const metaRes = await axios.get(
        `https://graph.facebook.com/v18.0/${business_account_id}?fields=id,name`,
        { headers: { Authorization: `Bearer ${access_token}` }, timeout: 10000 }
      );

      res.json({
        success: true,
        message: 'Connection successful',
        metaBusinessAccountId: metaRes.data.id,
        metaBusinessAccountName: metaRes.data.name || null,
      });
    } catch (metaErr) {
      logger.warn('WABA direct test connection failed', {
        error: metaErr.response?.data || metaErr.message,
      });

      const metaError = metaErr.response?.data?.error;
      res.status(400).json({
        success: false,
        message: 'Connection failed',
        error: metaError?.message || metaErr.message || 'Unknown error',
        code: metaError?.code || null,
      });
    }
  } catch (err) {
    logger.error('Test WABA connection error', err);
    next(err);
  }
});

// POST /:id/test - test connection to Meta for existing WABA
router.post('/:id/test', async (req, res, next) => {
  try {
    const wabaResult = await query(
      'SELECT id, name, business_account_id, access_token, org_id FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (wabaResult.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    const waba = wabaResult.rows[0];

    // Agent access check
    if (req.user.role === 'agent') {
      const accessCheck = await query(
        'SELECT 1 FROM agent_waba_access WHERE agent_id = $1 AND waba_account_id = $2',
        [req.user.id, req.params.id]
      );
      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You do not have access to this WABA account' });
      }
    }

    // Test call to Meta Graph API
    try {
      const metaRes = await axios.get(
        `https://graph.facebook.com/v18.0/${waba.business_account_id}?fields=id,name`,
        { headers: { Authorization: `Bearer ${waba.access_token}` }, timeout: 10000 }
      );

      res.json({
        success: true,
        message: 'Connection successful',
        metaBusinessAccountId: metaRes.data.id,
        metaBusinessAccountName: metaRes.data.name || null,
      });
    } catch (metaErr) {
      logger.warn('WABA test connection failed', {
        wabaId: req.params.id,
        error: metaErr.response?.data || metaErr.message,
      });

      const metaError = metaErr.response?.data?.error;
      res.status(400).json({
        success: false,
        message: 'Connection failed',
        error: metaError?.message || metaErr.message || 'Unknown error',
        code: metaError?.code || null,
      });
    }
  } catch (err) {
    logger.error('Test WABA connection error', err);
    next(err);
  }
});

// GET /:id/webhook-config - return the correct callback URL and verify token
router.get('/:id/webhook-config', async (req, res, next) => {
  try {
    const wabaResult = await query(
      'SELECT id, webhook_verify_token FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (wabaResult.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    const waba = wabaResult.rows[0];
    const baseUrl = config.publicUrl || `${req.protocol}://${req.get('host')}`;
    const callbackUrl = `${baseUrl}/api/v1/webhooks?waba_id=${waba.id}`;

    res.json({
      callbackUrl,
      verifyToken: waba.webhook_verify_token,
    });
  } catch (err) {
    next(err);
  }
});

// POST /:id/subscribe - subscribe WABA to Meta webhooks via Graph API
router.post('/:id/subscribe', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const wabaResult = await query(
      'SELECT id, business_account_id, access_token, org_id, webhook_verify_token FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (wabaResult.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    let waba = wabaResult.rows[0];

    // Auto-generate verify token if missing (for pre-existing WABAs)
    if (!waba.webhook_verify_token) {
      const newToken = crypto.randomBytes(32).toString('hex');
      await query(
        'UPDATE waba_accounts SET webhook_verify_token = $1 WHERE id = $2',
        [newToken, waba.id]
      );
      waba.webhook_verify_token = newToken;
    }

    // Use configured public URL; fall back to frontend-provided base_url, then request host
    const baseUrl = config.publicUrl || req.body.base_url || `${req.protocol}://${req.get('host')}`;
    const callbackUrl = `${baseUrl}/api/v1/webhooks?waba_id=${waba.id}`;
    const graphUrl = `https://graph.facebook.com/${config.whatsappApiVersion}/${waba.business_account_id}/subscribed_apps`;

    try {
      await axios.post(
        graphUrl,
        {
          override_callback_uri: callbackUrl,
          verify_token: waba.webhook_verify_token,
        },
        {
          headers: { Authorization: `Bearer ${waba.access_token}` },
          timeout: 15000,
        }
      );

      logger.info('WABA subscribed to webhooks', { wabaId: waba.id, businessAccountId: waba.business_account_id, callbackUrl });
      res.json({ success: true, message: 'Webhook subscription successful', callbackUrl });
    } catch (metaErr) {
      logger.warn('WABA webhook subscription failed', {
        wabaId: waba.id,
        callbackUrl,
        error: metaErr.response?.data || metaErr.message,
      });
      const metaError = metaErr.response?.data?.error;
      res.status(400).json({
        success: false,
        message: metaError?.message || 'Webhook subscription failed',
        code: metaError?.code || null,
      });
    }
  } catch (err) {
    logger.error('Subscribe WABA webhooks error', err);
    next(err);
  }
});

module.exports = router;
