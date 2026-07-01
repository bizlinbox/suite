const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);

// GET / - list agents in org
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, name, email, role, status, created_at
       FROM users WHERE org_id = $1`,
      [req.user.org_id]
    );
    res.json({ agents: camelize(result.rows) });
  } catch (err) {
    logger.error('List agents error', err);
    next(err);
  }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, name, email, role, status, created_at
       FROM users WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ agent: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Get agent error', err);
    next(err);
  }
});

// POST / - create agent (admin only)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role = 'agent' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // Validate role exists in organization
    const roleCheck = await query(
      'SELECT id FROM roles WHERE name = $1 AND org_id = $2',
      [role, req.user.org_id]
    );
    if (roleCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email already exists in org
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 AND org_id = $2',
      [email, req.user.org_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists in this organization' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (org_id, name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, org_id, name, email, role, status, created_at`,
      [req.user.org_id, name, email, passwordHash, role]
    );
    res.status(201).json({ agent: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Create agent error', err);
    next(err);
  }
});

// PUT /:id - update agent (admin only)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { name, email, role, status } = req.body;

    // Validate role if provided
    if (role) {
      const roleCheck = await query(
        'SELECT id FROM roles WHERE name = $1 AND org_id = $2',
        [role, req.user.org_id]
      );
      if (roleCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid role' });
      }
    }

    const result = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           status = COALESCE($4, status)
       WHERE id = $5 AND org_id = $6
       RETURNING id, org_id, name, email, role, status, created_at`,
      [name, email, role, status, req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ agent: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update agent error', err);
    next(err);
  }
});

// DELETE /:id - delete agent (admin only)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM users WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ message: 'Agent deleted' });
  } catch (err) {
    logger.error('Delete agent error', err);
    next(err);
  }
});

module.exports = router;
