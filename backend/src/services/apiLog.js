const { query } = require('../db');
const logger = require('../utils/logger');

/**
 * Log an API call to a third-party service.
 * @param {Object} params
 * @param {string} params.orgId
 * @param {string} [params.conversationId]
 * @param {'outgoing'|'incoming'} params.direction
 * @param {string} [params.provider] - e.g. 'whatsapp', 'meta', 'stripe'
 * @param {string} params.endpoint
 * @param {string} params.method - HTTP method
 * @param {Object} [params.requestBody]
 * @param {Object} [params.responseBody]
 * @param {number} [params.statusCode]
 * @param {number} [params.durationMs]
 * @param {boolean} [params.success]
 * @param {string} [params.errorMessage]
 */
async function logApiCall(params) {
  try {
    const {
      orgId,
      conversationId,
      direction,
      provider = 'whatsapp',
      endpoint,
      method,
      requestBody,
      responseBody,
      statusCode,
      durationMs,
      success = true,
      errorMessage,
    } = params;

    await query(
      `INSERT INTO api_logs (
        org_id, conversation_id, direction, provider, endpoint, method,
        request_body, response_body, status_code, duration_ms, success, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        orgId || null,
        conversationId || null,
        direction,
        provider,
        endpoint,
        method,
        requestBody ? JSON.stringify(requestBody) : null,
        responseBody ? JSON.stringify(responseBody) : null,
        statusCode || null,
        durationMs || null,
        success,
        errorMessage || null,
      ]
    );
  } catch (err) {
    // Never throw — API logging must not break the main flow
    logger.error('Failed to write API log', { error: err.message });
  }
}

/**
 * List API logs for an organization with optional filtering.
 */
async function listApiLogs({ orgId, conversationId, direction, provider, limit = 50, offset = 0 }) {
  let sql = `SELECT * FROM api_logs WHERE org_id = $1`;
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

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');

  sql += ` ORDER BY created_at DESC LIMIT $${++paramIndex} OFFSET $${++paramIndex}`;
  params.push(limit, offset);

  const [dataResult, countResult] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, paramIndex - 2)),
  ]);

  return {
    logs: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
}

module.exports = {
  logApiCall,
  listApiLogs,
};
