const express = require('express');
const { query } = require('../db');
const { authenticate, resolveWabaAccount } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');

const router = express.Router();

router.use(authenticate);
router.use(resolveWabaAccount);

// GET / - analytics stats
router.get('/', async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    const wabaAccountId = req.wabaAccountId;

    let totalConversationsSql = 'SELECT COUNT(*) as count FROM conversations WHERE org_id = $1';
    const totalConversationsParams = [orgId];
    if (wabaAccountId) {
      totalConversationsSql += ' AND waba_account_id = $2';
      totalConversationsParams.push(wabaAccountId);
    }
    const totalConversationsResult = await query(totalConversationsSql, totalConversationsParams);
    const totalConversations = parseInt(totalConversationsResult.rows[0].count, 10);

    let totalMessagesSql = `SELECT COUNT(*) as count FROM messages m
                            JOIN conversations c ON c.id = m.conversation_id
                            WHERE c.org_id = $1`;
    const totalMessagesParams = [orgId];
    if (wabaAccountId) {
      totalMessagesSql += ' AND c.waba_account_id = $2';
      totalMessagesParams.push(wabaAccountId);
    }
    const totalMessagesResult = await query(totalMessagesSql, totalMessagesParams);
    const totalMessages = parseInt(totalMessagesResult.rows[0].count, 10);

    let avgResponseTimeSql = `SELECT AVG(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))) as avg_seconds
                              FROM messages m1
                              JOIN messages m2 ON m2.conversation_id = m1.conversation_id AND m2.created_at > m1.created_at
                              JOIN conversations c ON c.id = m1.conversation_id
                              WHERE c.org_id = $1 AND m1.sender_type = 'contact' AND m2.sender_type = 'agent'`;
    const avgResponseTimeParams = [orgId];
    if (wabaAccountId) {
      avgResponseTimeSql += ' AND c.waba_account_id = $2';
      avgResponseTimeParams.push(wabaAccountId);
    }
    const avgResponseTimeResult = await query(avgResponseTimeSql, avgResponseTimeParams);
    const avgResponseTime = avgResponseTimeResult.rows[0].avg_seconds
      ? parseFloat(avgResponseTimeResult.rows[0].avg_seconds)
      : 0;

    // Messages per day (last 30 days)
    let messagesPerDaySql = `SELECT DATE(m.created_at) as day, COUNT(*) as count
                              FROM messages m
                              JOIN conversations c ON c.id = m.conversation_id
                              WHERE c.org_id = $1 AND m.created_at >= NOW() - INTERVAL '30 days'`;
    const messagesPerDayParams = [orgId];
    if (wabaAccountId) {
      messagesPerDaySql += ' AND c.waba_account_id = $2';
      messagesPerDayParams.push(wabaAccountId);
    }
    messagesPerDaySql += ` GROUP BY DATE(m.created_at)
                           ORDER BY day ASC`;
    const messagesPerDayResult = await query(messagesPerDaySql, messagesPerDayParams);

    // Conversations per day (last 30 days)
    let conversationsPerDaySql = `SELECT DATE(created_at) as day, COUNT(*) as count
                                  FROM conversations
                                  WHERE org_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`;
    const conversationsPerDayParams = [orgId];
    if (wabaAccountId) {
      conversationsPerDaySql += ' AND waba_account_id = $2';
      conversationsPerDayParams.push(wabaAccountId);
    }
    conversationsPerDaySql += ` GROUP BY DATE(created_at)
                                ORDER BY day ASC`;
    const conversationsPerDayResult = await query(conversationsPerDaySql, conversationsPerDayParams);

    // Top agents by conversations handled
    let topAgentsSql = `SELECT u.name, COUNT(c.id) as conversations_handled
                        FROM conversations c
                        JOIN users u ON u.id = c.assigned_agent_id
                        WHERE c.org_id = $1`;
    const topAgentsParams = [orgId];
    if (wabaAccountId) {
      topAgentsSql += ' AND c.waba_account_id = $2';
      topAgentsParams.push(wabaAccountId);
    }
    topAgentsSql += ` GROUP BY u.id, u.name
                      ORDER BY conversations_handled DESC
                      LIMIT 10`;
    const topAgentsResult = await query(topAgentsSql, topAgentsParams);

    // Messages by type
    let messagesByTypeSql = `SELECT m.message_type, COUNT(*) as count
                             FROM messages m
                             JOIN conversations c ON c.id = m.conversation_id
                             WHERE c.org_id = $1`;
    const messagesByTypeParams = [orgId];
    if (wabaAccountId) {
      messagesByTypeSql += ' AND c.waba_account_id = $2';
      messagesByTypeParams.push(wabaAccountId);
    }
    messagesByTypeSql += ` GROUP BY m.message_type
                           ORDER BY count DESC`;
    const messagesByTypeResult = await query(messagesByTypeSql, messagesByTypeParams);

    res.json(camelize({
      total_conversations: totalConversations,
      total_messages: totalMessages,
      avg_response_time_seconds: avgResponseTime,
      messages_per_day: messagesPerDayResult.rows,
      conversations_per_day: conversationsPerDayResult.rows,
      top_agents: topAgentsResult.rows,
      messages_by_type: messagesByTypeResult.rows,
    }));
  } catch (err) {
    logger.error('Analytics error', err);
    next(err);
  }
});

module.exports = router;
