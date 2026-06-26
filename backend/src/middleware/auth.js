const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { query } = require('../db');

async function authenticate(req, res, next) {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = {
      id: decoded.id,
      org_id: decoded.org_id,
      role: decoded.role,
    };

    // Load permissions from roles table
    try {
      const roleResult = await query(
        'SELECT permissions FROM roles WHERE org_id = $1 AND name = $2',
        [req.user.org_id, req.user.role]
      );
      req.user.permissions = roleResult.rows.length > 0 ? roleResult.rows[0].permissions : [];
    } catch (err) {
      logger.error('Load role error', err);
      req.user.permissions = [];
    }

    next();
  } catch (err) {
    logger.warn('JWT verification failed', { path: req.path, message: err.message });
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    const userPerms = req.user?.permissions || [];
    const hasPermission = permissions.some((p) => userPerms.includes(p));
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  const userPerms = req.user?.permissions || [];
  if (!userPerms.includes('users.manage')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

async function resolveWabaAccount(req, res, next) {
  const wabaId = req.headers['x-waba-account-id'];
  if (!wabaId) {
    req.wabaAccountId = null;
    return next();
  }

  try {
    // Verify WABA belongs to user's org
    const wabaResult = await query(
      'SELECT id FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [wabaId, req.user.org_id]
    );
    if (wabaResult.rows.length === 0) {
      return res.status(403).json({ error: 'WABA account not found or not accessible' });
    }

    // If not admin (doesn't have settings.manage), verify explicit WABA access
    const userPerms = req.user?.permissions || [];
    if (!userPerms.includes('settings.manage')) {
      const accessResult = await query(
        'SELECT id FROM agent_waba_access WHERE agent_id = $1 AND waba_account_id = $2',
        [req.user.id, wabaId]
      );
      if (accessResult.rows.length === 0) {
        return res.status(403).json({ error: 'You do not have access to this WABA account' });
      }
    }

    req.wabaAccountId = wabaId;
    next();
  } catch (err) {
    logger.error('WABA resolve error', err);
    next(err);
  }
}

module.exports = { authenticate, requirePermission, requireAdmin, resolveWabaAccount };
