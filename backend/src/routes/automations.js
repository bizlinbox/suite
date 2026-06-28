const express = require('express');
const { query, pool } = require('../db');
const { authenticate, resolveWabaAccount } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);
router.use(resolveWabaAccount);

const VALID_STEP_TYPES = new Set([
  'trigger_message',
  'trigger_conversation_opened',
  'trigger_webhook',
  'send_text',
  'send_template',
  'send_media_image',
  'send_media_video',
  'send_media_document',
  'send_media_audio',
  'send_interactive_buttons',
  'send_interactive_list',
  'condition',
  'delay',
  'tag_contact',
  'assign_agent',
]);

function validateStepTypes(steps) {
  for (const step of steps || []) {
    if (!VALID_STEP_TYPES.has(step.type)) {
      return `Invalid step type: ${step.type}`;
    }
  }
  return null;
}

// GET / - list automations for org
router.get('/', async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    const wabaId = req.wabaAccountId;

    const conditions = ['a.org_id = $1'];
    const params = [orgId];
    let paramIdx = 2;

    if (wabaId) {
      conditions.push(`a.waba_account_id = $${paramIdx++}`);
      params.push(wabaId);
    }

    const whereClause = conditions.join(' AND ');

    const result = await query(
      `SELECT a.id, a.org_id, a.waba_account_id, a.name, a.is_active, a.created_at, a.updated_at,
              COUNT(an.id)::int AS step_count
       FROM automations a
       LEFT JOIN automation_nodes an ON an.automation_id = a.id
       WHERE ${whereClause}
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      params
    );

    res.json({ automations: camelize(result.rows) });
  } catch (err) {
    logger.error('List automations error', err);
    next(err);
  }
});

// GET /:id - get single automation with steps (ordered linearly)
router.get('/:id', async (req, res, next) => {
  try {
    const automationResult = await query(
      `SELECT id, org_id, waba_account_id, name, is_active, created_at, updated_at
       FROM automations WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );

    if (automationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    const automation = camelize(automationResult.rows[0]);

    const nodesResult = await query(
      `SELECT id, automation_id, type, label, config, created_at
       FROM automation_nodes WHERE automation_id = $1 ORDER BY created_at`,
      [req.params.id]
    );

    res.json({
      automation,
      steps: camelize(nodesResult.rows).map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        config: n.config || {},
      })),
    });
  } catch (err) {
    logger.error('Get automation error', err);
    next(err);
  }
});

// POST / - create automation with steps
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, waba_account_id, steps = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const typeError = validateStepTypes(steps);
    if (typeError) {
      return res.status(400).json({ error: typeError });
    }

    await client.query('BEGIN');

    const automationResult = await client.query(
      `INSERT INTO automations (org_id, waba_account_id, name, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, org_id, waba_account_id, name, is_active, created_at, updated_at`,
      [req.user.org_id, waba_account_id || null, name, true]
    );
    const automation = automationResult.rows[0];
    const automationId = automation.id;

    const insertedSteps = [];
    for (const step of steps) {
      const stepResult = await client.query(
        `INSERT INTO automation_nodes (automation_id, type, label, position_x, position_y, config)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, automation_id, type, label, config, created_at`,
        [
          automationId,
          step.type,
          step.label || null,
          0, 0,
          JSON.stringify(step.config || {}),
        ]
      );
      insertedSteps.push(stepResult.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      automation: camelize(automation),
      steps: camelize(insertedSteps).map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        config: n.config || {},
      })),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Create automation error', err);
    next(err);
  } finally {
    client.release();
  }
});

// PUT /:id - update automation (replace entire step sequence)
router.put('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, waba_account_id, steps = [] } = req.body;
    const automationId = req.params.id;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const typeError = validateStepTypes(steps);
    if (typeError) {
      return res.status(400).json({ error: typeError });
    }

    await client.query('BEGIN');

    const checkResult = await client.query(
      'SELECT id FROM automations WHERE id = $1 AND org_id = $2',
      [automationId, req.user.org_id]
    );
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Automation not found' });
    }

    const automationResult = await client.query(
      `UPDATE automations
       SET name = $1, waba_account_id = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, org_id, waba_account_id, name, is_active, created_at, updated_at`,
      [name, waba_account_id || null, automationId]
    );
    const automation = automationResult.rows[0];

    await client.query('DELETE FROM automation_nodes WHERE automation_id = $1', [automationId]);

    const insertedSteps = [];
    for (const step of steps) {
      const stepResult = await client.query(
        `INSERT INTO automation_nodes (automation_id, type, label, position_x, position_y, config)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, automation_id, type, label, config, created_at`,
        [
          automationId,
          step.type,
          step.label || null,
          0, 0,
          JSON.stringify(step.config || {}),
        ]
      );
      insertedSteps.push(stepResult.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      automation: camelize(automation),
      steps: camelize(insertedSteps).map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        config: n.config || {},
      })),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Update automation error', err);
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM automations WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete automation error', err);
    next(err);
  }
});

// POST /:id/toggle - toggle is_active
router.post('/:id/toggle', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE automations SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 AND org_id = $2
       RETURNING id, is_active`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    res.json({ automation: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Toggle automation error', err);
    next(err);
  }
});

module.exports = router;
