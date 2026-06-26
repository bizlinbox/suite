const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);

// GET / - list workflows for org
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, name, trigger_type, conditions, actions, is_active, created_at
       FROM workflows WHERE org_id = $1 ORDER BY created_at DESC`,
      [req.user.org_id]
    );
    const workflows = camelize(result.rows).map((w) => ({ ...w, trigger: w.triggerType, active: w.isActive }));
    res.json({ workflows });
  } catch (err) {
    logger.error('List workflows error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, name, trigger_type, conditions, actions, is_active, created_at
       FROM workflows WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    const workflow = camelize(result.rows[0]);
    res.json({ workflow: { ...workflow, trigger: workflow.triggerType, active: workflow.isActive } });
  } catch (err) {
    logger.error('Get workflow error', err);
    next(err);
  }
});

// POST /
router.post('/', async (req, res, next) => {
  try {
    const { name, trigger_type, conditions, actions, is_active = true } = req.body;
    if (!name || !trigger_type) {
      return res.status(400).json({ error: 'name and trigger_type are required' });
    }
    const result = await query(
      `INSERT INTO workflows (org_id, name, trigger_type, conditions, actions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, org_id, name, trigger_type, conditions, actions, is_active, created_at`,
      [req.user.org_id, name, trigger_type, JSON.stringify(conditions || {}), JSON.stringify(actions || []), is_active]
    );
    const workflow = camelize(result.rows[0]);
    res.status(201).json({ workflow: { ...workflow, trigger: workflow.triggerType, active: workflow.isActive } });
  } catch (err) {
    logger.error('Create workflow error', err);
    next(err);
  }
});

// PUT /:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, trigger_type, conditions, actions, is_active } = req.body;
    const result = await query(
      `UPDATE workflows
       SET name = COALESCE($1, name),
           trigger_type = COALESCE($2, trigger_type),
           conditions = COALESCE($3, conditions),
           actions = COALESCE($4, actions),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 AND org_id = $7
       RETURNING id, org_id, name, trigger_type, conditions, actions, is_active, created_at`,
      [
        name,
        trigger_type,
        conditions !== undefined ? JSON.stringify(conditions) : undefined,
        actions !== undefined ? JSON.stringify(actions) : undefined,
        is_active,
        req.params.id,
        req.user.org_id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    const workflow = camelize(result.rows[0]);
    res.json({ workflow: { ...workflow, trigger: workflow.triggerType, active: workflow.isActive } });
  } catch (err) {
    logger.error('Update workflow error', err);
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM workflows WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({ message: 'Workflow deleted' });
  } catch (err) {
    logger.error('Delete workflow error', err);
    next(err);
  }
});

module.exports = router;
