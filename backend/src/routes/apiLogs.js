const express = require('express');
const { query } = require('../db');
const { authenticate, requirePermission } = require('../middleware/auth');
const camelize = require('../utils/camelize');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticate);

// GET /api/v1/api-logs - list API logs for the current org
router.get('/', async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    const { conversationId, direction, provider, limit = '50', offset = '0' } = req.query;

    let sql = `SELECT id, org_id, conversation_id, direction, provider, endpoint, method, request_body, response_body, status_code, duration_ms, success, error_message, created_at
                 FROM api_logs WHERE org_id = $1`;
    const params = [orgId];
    let paramIndex = 1;

    if (conversationId) {
      paramIndex++;
      sql += ` AND conversation_id = $${paramIndex}`;
      params.push(conversationId);
    }
    if (direction) {
      paramIndex++;
      sql += ` AND direction = $${paramIndex}`;
      params.push(direction);
    }
    if (provider) {
      paramIndex++;
      sql += ` AND provider = $${paramIndex}`;
      params.push(provider);
    }

    const countSql = sql.replace(
      'SELECT id, org_id, conversation_id, direction, provider, endpoint, method, request_body, response_body, status_code, duration_ms, success, error_message, created_at',
      'SELECT COUNT(*) as total'
    );

    sql += ` ORDER BY created_at DESC LIMIT $${++paramIndex} OFFSET $${++paramIndex}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [dataResult, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, paramIndex - 2)),
    ]);

    res.json({
      logs: camelize(dataResult.rows),
      total: parseInt(countResult.rows[0].total, 10),
    });
  } catch (err) {
    logger.error('List API logs error', err);
    next(err);
  }
});

// DELETE /api/v1/api-logs - clear all API logs for the current org
router.delete('/', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    const result = await query('DELETE FROM api_logs WHERE org_id = $1', [orgId]);
    res.json({ message: 'API logs cleared', deleted: result.rowCount });
  } catch (err) {
    logger.error('Clear API logs error', err);
    next(err);
  }
});

module.exports = router;
