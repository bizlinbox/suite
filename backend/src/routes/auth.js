const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const config = require('../config');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  org_name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  org_name: z.string().min(1).max(100),
});

const router = express.Router();

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, org_id: user.org_id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtAccessExpiresIn }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );
}

function setTokenCookies(res, accessToken, refreshToken) {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

async function buildUserResponse(user) {
  const roleResult = await query(
    'SELECT permissions FROM roles WHERE org_id = $1 AND name = $2',
    [user.org_id, user.role]
  );
  const permissions = roleResult.rows.length > 0 ? roleResult.rows[0].permissions : [];
  const isAdmin = permissions.includes('users.manage');

  let wabaQuery;
  if (isAdmin) {
    wabaQuery = await query(
      'SELECT id, name, business_account_id, is_active FROM waba_accounts WHERE org_id = $1 AND is_active = true ORDER BY name',
      [user.org_id]
    );
  } else {
    wabaQuery = await query(
      `SELECT w.id, w.name, w.business_account_id, w.is_active
       FROM waba_accounts w
       INNER JOIN agent_waba_access a ON a.waba_account_id = w.id
       WHERE w.org_id = $1 AND a.agent_id = $2 AND w.is_active = true
       ORDER BY w.name`,
      [user.org_id, user.id]
    );
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions,
    organizationId: user.org_id,
    wabaAccounts: wabaQuery.rows.map((r) => ({
      id: r.id,
      name: r.name,
      businessAccountId: r.business_account_id,
      isActive: r.is_active,
    })),
  };
}

// POST /register
router.post('/register', async (req, res, next) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid input', details: parse.error.errors });
  }

  try {
    const { email, password, name, org_name } = req.body;
    if (!email || !password || !name || !org_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if public registration is enabled
    const settingsResult = await query(
      'SELECT enable_public_registration FROM organizations ORDER BY created_at LIMIT 1'
    );
    if (settingsResult.rows.length > 0 && settingsResult.rows[0].enable_public_registration === false) {
      return res.status(403).json({ error: 'Public registration is disabled' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const orgResult = await query(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
      [org_name]
    );
    const orgId = orgResult.rows[0].id;

    // Seed default roles for the new organization
    const ALL_PERMISSIONS = [
      'conversations.read','conversations.manage',
      'contacts.read','contacts.manage',
      'campaigns.read','campaigns.manage',
      'automations.read','automations.manage',
      'analytics.read',
      'users.read','users.manage',
      'roles.read','roles.manage',
      'settings.read','settings.manage',
    ];
    const AGENT_PERMISSIONS = [
      'conversations.read','conversations.manage',
      'contacts.read','contacts.manage',
      'analytics.read',
      'settings.read',
    ];
    await query(
      `INSERT INTO roles (org_id, name, permissions, is_system) VALUES ($1, 'admin', $2, true)`,
      [orgId, JSON.stringify(ALL_PERMISSIONS)]
    );
    await query(
      `INSERT INTO roles (org_id, name, permissions, is_system) VALUES ($1, 'agent', $2, true)`,
      [orgId, JSON.stringify(AGENT_PERMISSIONS)]
    );

    const userResult = await query(
      `INSERT INTO users (org_id, name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'admin', 'active')
       RETURNING id, org_id, name, email, role, status`,
      [orgId, name, email, passwordHash]
    );
    const user = userResult.rows[0];

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    setTokenCookies(res, accessToken, refreshToken);

    const userResponse = await buildUserResponse(user);
    res.status(201).json({ user: userResponse });
  } catch (err) {
    logger.error('Registration error', err);
    next(err);
  }
});

// POST /login
router.post('/login', async (req, res, next) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid input', details: parse.error.errors });
  }

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const userResult = await query(
      'SELECT id, org_id, name, email, password_hash, role, status FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    setTokenCookies(res, accessToken, refreshToken);

    const userResponse = await buildUserResponse(user);
    res.json({ user: userResponse });
  } catch (err) {
    logger.error('Login error', err);
    next(err);
  }
});

// POST /refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(oldRefreshToken, config.jwtRefreshSecret);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokenResult = await query(
      'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token = $1',
      [oldRefreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    const storedToken = tokenResult.rows[0];
    if (new Date(storedToken.expires_at) < new Date()) {
      await query('DELETE FROM refresh_tokens WHERE id = $1', [storedToken.id]);
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const userResult = await query(
      'SELECT id, org_id, name, email, role, status FROM users WHERE id = $1',
      [storedToken.user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Rotate refresh token
    await query('DELETE FROM refresh_tokens WHERE id = $1', [storedToken.id]);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    setTokenCookies(res, accessToken, refreshToken);

    res.json({ message: 'Tokens refreshed' });
  } catch (err) {
    logger.error('Refresh error', err);
    next(err);
  }
});

// GET /me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userResult = await query(
      'SELECT id, org_id, name, email, role, status FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const userResponse = await buildUserResponse(user);
    res.json({ user: userResponse });
  } catch (err) {
    logger.error('Get me error', err);
    next(err);
  }
});

// PATCH /me - update current user profile
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  current_password: z.string().min(1).optional(),
  new_password: z.string().min(8).max(128).optional(),
});

router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const parse = updateProfileSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error.errors });
    }

    const { name, email, current_password, new_password } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Fetch current user
    const userResult = await query(
      'SELECT id, name, email, password_hash FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const currentUser = userResult.rows[0];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined && name !== currentUser.name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (email !== undefined && email !== currentUser.email) {
      // Check email uniqueness within org
      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND org_id = $2 AND id != $3',
        [email, orgId, userId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      const valid = await bcrypt.compare(current_password, currentUser.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      const passwordHash = await bcrypt.hash(new_password, 12);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.json({ user: { id: currentUser.id, name: currentUser.name, email: currentUser.email } });
    }

    values.push(userId);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, email, role, status`;
    const result = await query(sql, values);
    const updatedUser = result.rows[0];

    res.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });
  } catch (err) {
    logger.error('Update profile error', err);
    next(err);
  }
});

// GET /public-settings
router.get('/public-settings', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT platform_name, platform_logo, enable_public_registration FROM organizations ORDER BY created_at LIMIT 1'
    );
    if (result.rows.length === 0) {
      return res.json({
        platformName: 'BizlInbox',
        platformLogo: null,
        enablePublicRegistration: true,
      });
    }
    const row = result.rows[0];
    res.json({
      platformName: row.platform_name || 'BizlInbox',
      platformLogo: row.platform_logo || null,
      enablePublicRegistration: row.enable_public_registration ?? true,
    });
  } catch (err) {
    logger.error('Public settings error', err);
    next(err);
  }
});

// GET /setup-required
router.get('/setup-required', async (req, res, next) => {
  try {
    const result = await query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    const count = parseInt(result.rows[0].count, 10);
    res.json({ needsSetup: count === 0 });
  } catch (err) {
    logger.error('Setup check error', err);
    next(err);
  }
});

// POST /setup - create first super-admin without auth
router.post('/setup', async (req, res, next) => {
  try {
    const parse = setupSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid input', details: parse.error.errors });
    }

    // Block if any admin already exists
    const existing = await query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    if (parseInt(existing.rows[0].count, 10) > 0) {
      return res.status(403).json({ error: 'Setup already completed' });
    }

    const { email, password, name, org_name } = req.body;
    if (!email || !password || !name || !org_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const orgResult = await query(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
      [org_name]
    );
    const orgId = orgResult.rows[0].id;

    // Seed default roles for the new organization
    const ALL_PERMISSIONS = [
      'conversations.read','conversations.manage',
      'contacts.read','contacts.manage',
      'campaigns.read','campaigns.manage',
      'automations.read','automations.manage',
      'analytics.read',
      'users.read','users.manage',
      'roles.read','roles.manage',
      'settings.read','settings.manage',
    ];
    const AGENT_PERMISSIONS = [
      'conversations.read','conversations.manage',
      'contacts.read','contacts.manage',
      'analytics.read',
      'settings.read',
    ];
    await query(
      `INSERT INTO roles (org_id, name, permissions, is_system) VALUES ($1, 'admin', $2, true)`,
      [orgId, JSON.stringify(ALL_PERMISSIONS)]
    );
    await query(
      `INSERT INTO roles (org_id, name, permissions, is_system) VALUES ($1, 'agent', $2, true)`,
      [orgId, JSON.stringify(AGENT_PERMISSIONS)]
    );

    const userResult = await query(
      `INSERT INTO users (org_id, name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'admin', 'active')
       RETURNING id, org_id, name, email, role, status`,
      [orgId, name, email, passwordHash]
    );
    const user = userResult.rows[0];

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    setTokenCookies(res, accessToken, refreshToken);

    logger.info('Initial setup completed', { orgId, adminId: user.id, email });

    const userResponse = await buildUserResponse(user);
    res.status(201).json({ user: userResponse });
  } catch (err) {
    logger.error('Setup error', err);
    next(err);
  }
});

// POST /logout
router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error('Logout error', err);
    next(err);
  }
});

module.exports = router;
