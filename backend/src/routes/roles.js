const express = require('express');
const { query } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);

// GET / - list roles in org
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, org_id, name, permissions, is_system, created_at FROM roles WHERE org_id = $1 ORDER BY name',
      [req.user.org_id]
    );
    res.json({ roles: camelize(result.rows) });
  } catch (err) {
    logger.error('List roles error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, org_id, name, permissions, is_system, created_at FROM roles WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json({ role: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get role error', err);
    next(err);
  }
});

// POST / - create role (admin only)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, permissions = [] } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await query(
      'SELECT id FROM roles WHERE name = $1 AND org_id = $2',
      [name, req.user.org_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Role name already exists in this organization' });
    }

    const result = await query(
      `INSERT INTO roles (org_id, name, permissions, is_system)
       VALUES ($1, $2, $3, false)
       RETURNING id, org_id, name, permissions, is_system, created_at`,
      [req.user.org_id, name, JSON.stringify(permissions)]
    );
    res.status(201).json({ role: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Create role error', err);
    next(err);
  }
});

// PUT /:id - update role (admin only)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { name, permissions } = req.body;

    // Prevent modifying system roles' permissions fully (only name change allowed for system roles)
    const existing = await query(
      'SELECT is_system FROM roles WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const isSystem = existing.rows[0].is_system;
    const result = await query(
      `UPDATE roles
       SET name = COALESCE($1, name),
           permissions = CASE WHEN $2 IS NOT NULL AND NOT $4 THEN $2 ELSE permissions END
       WHERE id = $3 AND org_id = $5
       RETURNING id, org_id, name, permissions, is_system, created_at`,
      [name, permissions ? JSON.stringify(permissions) : null, req.params.id, isSystem, req.user.org_id]
    );

    res.json({ role: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update role error', err);
    next(err);
  }
});

// DELETE /:id - delete role (admin only)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT is_system FROM roles WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    if (existing.rows[0].is_system) {
      return res.status(403).json({ error: 'System roles cannot be deleted' });
    }

    // Check if any users are assigned to this role
    const usersResult = await query(
      `SELECT COUNT(*) as count FROM users WHERE role = (SELECT name FROM roles WHERE id = $1) AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (parseInt(usersResult.rows[0].count) > 0) {
      return res.status(409).json({ error: 'Cannot delete role: users are still assigned to it' });
    }

    await query('DELETE FROM roles WHERE id = $1 AND org_id = $2', [req.params.id, req.user.org_id]);
    res.json({ message: 'Role deleted' });
  } catch (err) {
    logger.error('Delete role error', err);
    next(err);
  }
});

module.exports = router;
