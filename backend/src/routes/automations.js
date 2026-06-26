const express = require('express');
const { query, pool } = require('../db');
const { authenticate, resolveWabaAccount } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);
router.use(resolveWabaAccount);

const VALID_NODE_TYPES = new Set([
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

function validateNodeTypes(nodes) {
  for (const node of nodes || []) {
    if (!VALID_NODE_TYPES.has(node.type)) {
      return `Invalid node type: ${node.type}`;
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
              COUNT(an.id)::int AS node_count
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

// GET /:id - get single automation with nodes and edges
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

    const [nodesResult, edgesResult] = await Promise.all([
      query(
        `SELECT id, automation_id, type, label, position_x, position_y, config, created_at
         FROM automation_nodes WHERE automation_id = $1 ORDER BY created_at`,
        [req.params.id]
      ),
      query(
        `SELECT id, automation_id, source_node_id, target_node_id, label, created_at
         FROM automation_edges WHERE automation_id = $1 ORDER BY created_at`,
        [req.params.id]
      ),
    ]);

    res.json({
      automation,
      nodes: camelize(nodesResult.rows),
      edges: camelize(edgesResult.rows),
    });
  } catch (err) {
    logger.error('Get automation error', err);
    next(err);
  }
});

// POST / - create automation with nodes and edges
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, waba_account_id, nodes = [], edges = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const typeError = validateNodeTypes(nodes);
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

    const nodeMap = new Map();
    const insertedNodes = [];
    for (const node of nodes) {
      const nodeResult = await client.query(
        `INSERT INTO automation_nodes (automation_id, type, label, position_x, position_y, config)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, automation_id, type, label, position_x, position_y, config, created_at`,
        [
          automationId,
          node.type,
          node.label || null,
          node.positionX || 0,
          node.positionY || 0,
          JSON.stringify(node.config || {}),
        ]
      );
      const dbNode = nodeResult.rows[0];
      insertedNodes.push(dbNode);
      if (node.id) {
        nodeMap.set(String(node.id), dbNode.id);
      }
    }

    const insertedEdges = [];
    for (const edge of edges) {
      let sourceId = edge.sourceNodeId;
      let targetId = edge.targetNodeId;

      if (nodeMap.has(String(sourceId))) {
        sourceId = nodeMap.get(String(sourceId));
      }
      if (nodeMap.has(String(targetId))) {
        targetId = nodeMap.get(String(targetId));
      }

      const edgeResult = await client.query(
        `INSERT INTO automation_edges (automation_id, source_node_id, target_node_id, label)
         VALUES ($1, $2, $3, $4)
         RETURNING id, automation_id, source_node_id, target_node_id, label, created_at`,
        [automationId, sourceId, targetId, edge.label || null]
      );
      insertedEdges.push(edgeResult.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      automation: camelize(automation),
      nodes: camelize(insertedNodes),
      edges: camelize(insertedEdges),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Create automation error', err);
    next(err);
  } finally {
    client.release();
  }
});

// PUT /:id - update automation (replace entire graph)
router.put('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, waba_account_id, nodes = [], edges = [] } = req.body;
    const automationId = req.params.id;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const typeError = validateNodeTypes(nodes);
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

    await client.query('DELETE FROM automation_edges WHERE automation_id = $1', [automationId]);
    await client.query('DELETE FROM automation_nodes WHERE automation_id = $1', [automationId]);

    const nodeMap = new Map();
    const insertedNodes = [];
    for (const node of nodes) {
      const nodeResult = await client.query(
        `INSERT INTO automation_nodes (automation_id, type, label, position_x, position_y, config)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, automation_id, type, label, position_x, position_y, config, created_at`,
        [
          automationId,
          node.type,
          node.label || null,
          node.positionX || 0,
          node.positionY || 0,
          JSON.stringify(node.config || {}),
        ]
      );
      const dbNode = nodeResult.rows[0];
      insertedNodes.push(dbNode);
      if (node.id) {
        nodeMap.set(String(node.id), dbNode.id);
      }
    }

    const insertedEdges = [];
    for (const edge of edges) {
      let sourceId = edge.sourceNodeId;
      let targetId = edge.targetNodeId;

      if (nodeMap.has(String(sourceId))) {
        sourceId = nodeMap.get(String(sourceId));
      }
      if (nodeMap.has(String(targetId))) {
        targetId = nodeMap.get(String(targetId));
      }

      const edgeResult = await client.query(
        `INSERT INTO automation_edges (automation_id, source_node_id, target_node_id, label)
         VALUES ($1, $2, $3, $4)
         RETURNING id, automation_id, source_node_id, target_node_id, label, created_at`,
        [automationId, sourceId, targetId, edge.label || null]
      );
      insertedEdges.push(edgeResult.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      automation: camelize(automation),
      nodes: camelize(insertedNodes),
      edges: camelize(insertedEdges),
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
    res.json({ message: 'Automation deleted' });
  } catch (err) {
    logger.error('Delete automation error', err);
    next(err);
  }
});

// POST /:id/toggle - toggle is_active
router.post('/:id/toggle', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE automations
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 AND org_id = $2
       RETURNING id, org_id, waba_account_id, name, is_active, created_at, updated_at`,
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
