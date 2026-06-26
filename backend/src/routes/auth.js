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

    res.status(201).json({
      user: {
        id: user.id,
        org_id: user.org_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
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

    res.json({
      user: {
        id: user.id,
        org_id: user.org_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
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
    const permissions = req.user.permissions || [];
    const isAdmin = permissions.includes('users.manage');

    // Fetch accessible WABA accounts
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

    res.json({
      user: {
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
      },
    });
  } catch (err) {
    logger.error('Get me error', err);
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

    res.status(201).json({
      user: {
        id: user.id,
        org_id: user.org_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
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
