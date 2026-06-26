const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

// Public route - must be before authenticate middleware
// POST /agents/accept-invite - accept invitation and set password
router.post('/accept-invite', async (req, res, next) => {
  try {
    const { token, name, password } = req.body;
    if (!token || !name || !password) {
      return res.status(400).json({ error: 'Token, name and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find valid invitation
    const inviteResult = await query(
      `SELECT id, org_id, email, token, role, used, expires_at
       FROM invitations WHERE token = $1`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invitation token' });
    }

    const invitation = inviteResult.rows[0];

    if (invitation.used) {
      return res.status(410).json({ error: 'Invitation already used' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invitation expired' });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 AND org_id = $2',
      [invitation.email, invitation.org_id]
    );
    if (existingUser.rows.length > 0) {
      await query('UPDATE invitations SET used = true WHERE id = $1', [invitation.id]);
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await query(
      `INSERT INTO users (org_id, name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, org_id, name, email, role, status, created_at`,
      [invitation.org_id, name, invitation.email, passwordHash, invitation.role]
    );

    // Mark invitation as used
    await query('UPDATE invitations SET used = true WHERE id = $1', [invitation.id]);

    res.status(201).json({ agent: camelize(userResult.rows[0]) });
  } catch (err) {
    logger.error('Accept invite error', err);
    next(err);
  }
});

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
// If password is provided, agent is created immediately.
// If no password, an invitation token is returned.
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role = 'agent' } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if email already exists in org
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 AND org_id = $2',
      [email, req.user.org_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists in this organization' });
    }

    if (password) {
      // Create agent directly with password
      const passwordHash = await bcrypt.hash(password, 12);
      const result = await query(
        `INSERT INTO users (org_id, name, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING id, org_id, name, email, role, status, created_at`,
        [req.user.org_id, name, email, passwordHash, role]
      );
      res.status(201).json({ agent: camelize(result.rows[0]) });
    } else {
      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await query(
        `INSERT INTO invitations (org_id, email, token, role, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.org_id, email, token, role, expiresAt]
      );

      res.status(201).json({
        invitation: {
          token,
          email,
          role,
          expiresAt,
          inviteUrl: `/accept-invite?token=${token}`,
        },
      });
    }
  } catch (err) {
    logger.error('Create agent error', err);
    next(err);
  }
});

// PUT /:id - update agent (admin only)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { name, email, role, status } = req.body;
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
