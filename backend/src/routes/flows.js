const express = require('express');
const axios = require('axios');
const { query } = require('../db');
const { authenticate, resolveWabaAccount } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');
const {
  createFlow,
  updateFlow: updateMetaFlow,
  getFlow: getMetaFlow,
  listFlows,
  publishFlow,
  deleteFlow: deleteMetaFlow,
  sendFlowMessage,
} = require('../services/whatsappFlows');

const router = express.Router();

router.use(authenticate);
router.use(resolveWabaAccount);

// GET / - list flows
router.get('/', async (req, res, next) => {
  try {
    let sql = `SELECT id, org_id, waba_account_id, name, flow_id, category, status, flow_json, created_at, updated_at
               FROM flows WHERE org_id = $1`;
    const params = [req.user.org_id];

    if (req.wabaAccountId) {
      sql += ' AND waba_account_id = $2';
      params.push(req.wabaAccountId);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json({ flows: camelize(result.rows) });
  } catch (err) {
    logger.error('List flows error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, waba_account_id, name, flow_id, category, status, flow_json, created_at, updated_at
       FROM flows WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json({ flow: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get flow error', err);
    next(err);
  }
});

// POST / - create flow (calls Meta API then saves locally)
router.post('/', async (req, res, next) => {
  try {
    const { name, category, flowJson, waba_account_id } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const wabaId = waba_account_id || req.wabaAccountId;
    if (!wabaId) {
      return res.status(400).json({ error: 'waba_account_id is required' });
    }

    const wabaResult = await query(
      'SELECT phone_number_id, access_token, business_account_id FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [wabaId, req.user.org_id]
    );
    if (wabaResult.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    const { phone_number_id: phoneNumberId, access_token: accessToken } = wabaResult.rows[0];

    // Create on Meta
    const metaResult = await createFlow(
      phoneNumberId,
      accessToken,
      name,
      category || 'OTHER',
      flowJson || {}
    );

    const metaFlowId = metaResult.id;

    // Save locally
    const dbResult = await query(
      `INSERT INTO flows (org_id, waba_account_id, name, flow_id, category, status, flow_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, org_id, waba_account_id, name, flow_id, category, status, flow_json, created_at, updated_at`,
      [req.user.org_id, wabaId, name, metaFlowId, category || 'OTHER', 'DRAFT', JSON.stringify(flowJson || {})]
    );

    res.status(201).json({ flow: camelize(dbResult.rows[0]) });
  } catch (err) {
    logger.error('Create flow error', { message: err.message, response: err.response?.data });
    next(err);
  }
});

// PUT /:id - update flow JSON
router.put('/:id', async (req, res, next) => {
  try {
    const { name, category, flowJson } = req.body;

    const flowResult = await query(
      `SELECT id, waba_account_id, flow_id FROM flows WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const flow = flowResult.rows[0];

    // Update on Meta if flow_json provided
    if (flowJson && flow.flow_id) {
      const wabaResult = await query(
        'SELECT access_token FROM waba_accounts WHERE id = $1 AND org_id = $2',
        [flow.waba_account_id, req.user.org_id]
      );
      if (wabaResult.rows.length > 0) {
        try {
          await updateMetaFlow(flow.flow_id, wabaResult.rows[0].access_token, flowJson);
        } catch (metaErr) {
          logger.warn('Meta flow update failed', { error: metaErr.message });
        }
      }
    }

    const dbResult = await query(
      `UPDATE flows
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           flow_json = COALESCE($3, flow_json),
           updated_at = NOW()
       WHERE id = $4 AND org_id = $5
       RETURNING id, org_id, waba_account_id, name, flow_id, category, status, flow_json, created_at, updated_at`,
      [name, category, flowJson ? JSON.stringify(flowJson) : undefined, req.params.id, req.user.org_id]
    );

    res.json({ flow: camelize(dbResult.rows[0]) });
  } catch (err) {
    logger.error('Update flow error', err);
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const flowResult = await query(
      `SELECT id, waba_account_id, flow_id FROM flows WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const flow = flowResult.rows[0];

    // Delete from Meta if flow_id exists
    if (flow.flow_id) {
      const wabaResult = await query(
        'SELECT access_token FROM waba_accounts WHERE id = $1 AND org_id = $2',
        [flow.waba_account_id, req.user.org_id]
      );
      if (wabaResult.rows.length > 0) {
        try {
          await deleteMetaFlow(flow.flow_id, wabaResult.rows[0].access_token);
        } catch (metaErr) {
          logger.warn('Meta flow delete failed', { error: metaErr.message });
        }
      }
    }

    await query('DELETE FROM flows WHERE id = $1 AND org_id = $2', [req.params.id, req.user.org_id]);
    res.json({ message: 'Flow deleted' });
  } catch (err) {
    logger.error('Delete flow error', err);
    next(err);
  }
});

// POST /:id/publish - publish flow
router.post('/:id/publish', async (req, res, next) => {
  try {
    const flowResult = await query(
      `SELECT id, waba_account_id, flow_id FROM flows WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const flow = flowResult.rows[0];
    if (!flow.flow_id) {
      return res.status(400).json({ error: 'Flow has no Meta ID' });
    }

    const wabaResult = await query(
      'SELECT access_token FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [flow.waba_account_id, req.user.org_id]
    );
    if (wabaResult.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    await publishFlow(flow.flow_id, wabaResult.rows[0].access_token);

    await query(
      "UPDATE flows SET status = 'PUBLISHED', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );

    res.json({ message: 'Flow published' });
  } catch (err) {
    logger.error('Publish flow error', { message: err.message, response: err.response?.data });
    next(err);
  }
});

// POST /sync - sync flows from Meta
router.post('/sync', async (req, res, next) => {
  try {
    const { waba_account_id } = req.body;
    const wabaId = waba_account_id || req.wabaAccountId;
    if (!wabaId) {
      return res.status(400).json({ error: 'waba_account_id is required' });
    }

    const wabaResult = await query(
      'SELECT business_account_id, access_token FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [wabaId, req.user.org_id]
    );
    if (wabaResult.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    const { business_account_id: businessAccountId, access_token: accessToken } = wabaResult.rows[0];

    const metaFlows = await listFlows(businessAccountId, accessToken);
    let count = 0;

    for (const f of metaFlows) {
      // Try to get full flow details including JSON
      let flowJson = {};
      try {
        const detail = await getMetaFlow(f.id, accessToken);
        flowJson = detail.flow_json || detail.draft ? detail.draft.flow_json || {} : {};
      } catch (detailErr) {
        logger.warn('Could not fetch flow details', { flowId: f.id, error: detailErr.message });
      }

      await query(
        `INSERT INTO flows (org_id, waba_account_id, name, flow_id, category, status, flow_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (flow_id) DO UPDATE
         SET name = EXCLUDED.name,
             category = EXCLUDED.category,
             status = EXCLUDED.status,
             flow_json = EXCLUDED.flow_json,
             updated_at = NOW()`,
        [req.user.org_id, wabaId, f.name, f.id, (f.categories || ['OTHER'])[0], f.status || 'DRAFT', JSON.stringify(flowJson)]
      );
      count++;
    }

    res.json({ message: 'Flows synced', count });
  } catch (err) {
    logger.error('Sync flows error', err);
    next(err);
  }
});

// POST /:id/send - send flow to a conversation
router.post('/:id/send', async (req, res, next) => {
  try {
    const { conversation_id, header, body, footer, flow_token, screen, data } = req.body;
    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    const flowResult = await query(
      `SELECT id, waba_account_id, flow_id, name FROM flows WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const flow = flowResult.rows[0];
    if (!flow.flow_id) {
      return res.status(400).json({ error: 'Flow has no Meta ID' });
    }

    // Get conversation details
    const convResult = await query(
      `SELECT c.id, c.contact_id, c.waba_account_id, con.phone as contact_phone
       FROM conversations c JOIN contacts con ON con.id = c.contact_id
       WHERE c.id = $1 AND c.org_id = $2`,
      [conversation_id, req.user.org_id]
    );
    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conv = convResult.rows[0];

    // Get WABA credentials
    const wabaResult = await query(
      'SELECT phone_number_id, access_token FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [conv.waba_account_id || flow.waba_account_id, req.user.org_id]
    );
    if (wabaResult.rows.length === 0) {
      return res.status(404).json({ error: 'No WhatsApp number configured' });
    }

    const { phone_number_id: phoneNumberId, access_token: accessToken } = wabaResult.rows[0];

    if (!conv.contact_phone) {
      return res.status(400).json({ error: 'Contact has no phone number' });
    }

    // Save message in DB
    const msgResult = await query(
      `INSERT INTO messages (conversation_id, sender_type, content, message_type, status)
       VALUES ($1, 'agent', $2, 'interactive', 'sent')
       RETURNING id, conversation_id, sender_type, content, message_type, status, created_at`,
      [conversation_id, `Flow: ${flow.name}`]
    );
    const message = msgResult.rows[0];

    // Create pending flow submission
    const finalFlowToken = flow_token || `flow-${Date.now()}`;
    await query(
      `INSERT INTO flow_submissions (org_id, flow_id, conversation_id, contact_id, flow_token, status, response_json)
       VALUES ($1, $2, $3, $4, $5, 'pending', '{}')`,
      [req.user.org_id, flow.id, conversation_id, conv.contact_id, finalFlowToken]
    );

    // Emit real-time event
    const { emitToConversation, emitToOrg } = require('../services/socket');
    emitToConversation(req.user.org_id, conversation_id, 'new_message', camelize(message));
    emitToOrg(req.user.org_id, 'conversation_updated', camelize({ conversation_id, last_message_at: message.created_at }));

    // Send via WhatsApp
    const sendResult = await sendFlowMessage(phoneNumberId, accessToken, conv.contact_phone, {
      flowId: flow.flow_id,
      header,
      body: body || `Flow: ${flow.name}`,
      footer,
      flowToken: finalFlowToken,
      screen,
      data,
    });

    // Update external_id
    const externalId = sendResult.messages?.[0]?.id;
    if (externalId) {
      await query('UPDATE messages SET external_id = $1 WHERE id = $2', [externalId, message.id]);
    }

    res.json({ message: camelize(message) });
  } catch (err) {
    logger.error('Send flow error', { message: err.message, response: err.response?.data });
    next(err);
  }
});

// GET /:id/submissions - list submissions for a flow
router.get('/:id/submissions', async (req, res, next) => {
  try {
    const flowResult = await query(
      'SELECT id FROM flows WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const result = await query(
      `SELECT fs.id, fs.flow_id, fs.conversation_id, fs.contact_id, fs.flow_token,
              fs.response_json, fs.status, fs.created_at, fs.completed_at,
              c.name as contact_name, con.phone as contact_phone
       FROM flow_submissions fs
       JOIN contacts c ON c.id = fs.contact_id
       JOIN conversations con ON con.id = fs.conversation_id
       WHERE fs.flow_id = $1 AND fs.org_id = $2
       ORDER BY fs.created_at DESC`,
      [req.params.id, req.user.org_id]
    );

    res.json({ submissions: camelize(result.rows) });
  } catch (err) {
    logger.error('List flow submissions error', err);
    next(err);
  }
});

// GET /submissions/all - list all submissions for org
router.get('/submissions/all', async (req, res, next) => {
  try {
    let sql = `SELECT fs.id, fs.flow_id, fs.conversation_id, fs.contact_id, fs.flow_token,
                      fs.response_json, fs.status, fs.created_at, fs.completed_at,
                      f.name as flow_name, c.name as contact_name
               FROM flow_submissions fs
               LEFT JOIN flows f ON f.id = fs.flow_id
               JOIN contacts c ON c.id = fs.contact_id
               WHERE fs.org_id = $1`;
    const params = [req.user.org_id];

    if (req.wabaAccountId) {
      sql += ' AND f.waba_account_id = $2';
      params.push(req.wabaAccountId);
    }

    sql += ' ORDER BY fs.created_at DESC';

    const result = await query(sql, params);
    res.json({ submissions: camelize(result.rows) });
  } catch (err) {
    logger.error('List all flow submissions error', err);
    next(err);
  }
});

module.exports = router;
