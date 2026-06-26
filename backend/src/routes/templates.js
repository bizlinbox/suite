const express = require('express');
const axios = require('axios');
const { query } = require('../db');
const { authenticate, resolveWabaAccount } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);
router.use(resolveWabaAccount);

// GET / - list templates for the org
router.get('/', async (req, res, next) => {
  try {
    let sql = `SELECT id, org_id, waba_account_id, template_name, category, language, components, status, meta_template_id, created_at, updated_at
               FROM message_templates
               WHERE org_id = $1`;
    const params = [req.user.org_id];

    if (req.wabaAccountId) {
      sql += ' AND waba_account_id = $2';
      params.push(req.wabaAccountId);
    }

    // For agents, enforce WABA access via agent_waba_access
    if (req.user.role === 'agent') {
      if (!req.wabaAccountId) {
        sql += ` AND waba_account_id IN (
          SELECT waba_account_id FROM agent_waba_access WHERE agent_id = $${params.length + 1}
        )`;
        params.push(req.user.id);
      }
      // If wabaAccountId is set, resolveWabaAccount already verified agent access
    }

    sql += ' ORDER BY template_name ASC, language ASC';

    const result = await query(sql, params);
    res.json({ templates: camelize(result.rows) });
  } catch (err) {
    logger.error('List templates error', err);
    next(err);
  }
});

// GET /:id - get single template by ID
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, waba_account_id, template_name, category, language, components, status, meta_template_id, created_at, updated_at
       FROM message_templates
       WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = result.rows[0];

    // If agent, verify WABA access
    if (req.user.role === 'agent') {
      const accessResult = await query(
        'SELECT 1 FROM agent_waba_access WHERE agent_id = $1 AND waba_account_id = $2',
        [req.user.id, template.waba_account_id]
      );
      if (accessResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ template: camelize(template) });
  } catch (err) {
    logger.error('Get template error', err);
    next(err);
  }
});

// POST /refresh - refresh templates from Meta
router.post('/refresh', async (req, res, next) => {
  try {
    const { waba_account_id } = req.body;
    if (!waba_account_id) {
      return res.status(400).json({ error: 'waba_account_id is required' });
    }

    // Verify WABA belongs to org
    const wabaResult = await query(
      'SELECT id, business_account_id, access_token FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [waba_account_id, req.user.org_id]
    );
    if (wabaResult.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    // Agent access check (admins bypass)
    if (req.user.role === 'agent') {
      const accessCheck = await query(
        'SELECT 1 FROM agent_waba_access WHERE agent_id = $1 AND waba_account_id = $2',
        [req.user.id, waba_account_id]
      );
      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You do not have access to this WABA account' });
      }
    }

    const { business_account_id, access_token } = wabaResult.rows[0];

    // Call Meta Graph API
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${business_account_id}/message_templates?limit=1000`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const templates = response.data?.data || [];
    let count = 0;

    for (const t of templates) {
      await query(
        `INSERT INTO message_templates (org_id, waba_account_id, template_name, category, language, components, status, meta_template_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (waba_account_id, template_name, language) DO UPDATE
         SET category = EXCLUDED.category,
             components = EXCLUDED.components,
             status = EXCLUDED.status,
             meta_template_id = EXCLUDED.meta_template_id,
             updated_at = NOW()`,
        [
          req.user.org_id,
          waba_account_id,
          t.name,
          t.category,
          t.language,
          JSON.stringify(t.components || []),
          t.status,
          t.id || null,
        ]
      );
      count++;
    }

    res.json({ message: 'Templates refreshed', count });
  } catch (err) {
    logger.error('Refresh templates error', err);
    next(err);
  }
});

// POST /:id/preview - generate preview with dummy variables
router.post('/:id/preview', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, waba_account_id, template_name, category, language, components, status, meta_template_id, created_at, updated_at
       FROM message_templates
       WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = result.rows[0];

    // If agent, verify WABA access
    if (req.user.role === 'agent') {
      const accessResult = await query(
        'SELECT 1 FROM agent_waba_access WHERE agent_id = $1 AND waba_account_id = $2',
        [req.user.id, template.waba_account_id]
      );
      if (accessResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const components = template.components || [];
    const previewParts = [];

    for (const comp of components) {
      if (!comp.text) continue;
      let text = comp.text;
      // Substitute {{1}}, {{2}}, etc. with dummy values
      text = text.replace(/\{\{(\d+)\}\}/g, (match, num) => {
        const n = parseInt(num, 10);
        if (n === 1) return 'John';
        if (n === 2) return '12345';
        return `Value${n}`;
      });
      previewParts.push(text);
    }

    const preview = previewParts.join('\n');

    res.json({ preview });
  } catch (err) {
    logger.error('Preview template error', err);
    next(err);
  }
});

module.exports = router;
