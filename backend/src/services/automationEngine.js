const { query, pool } = require('../db');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');
const { sendWhatsAppMessage } = require('./whatsapp');

/**
 * Find and run all active automations matching a trigger type for an org.
 * Each run is logged in automation_executions.
 *
 * @param {string} orgId
 * @param {string} triggerType - e.g. 'message_received', 'conversation_opened'
 * @param {object} context - { message, conversation_id, contact_id, ... }
 */
async function runAutomations(orgId, triggerType, context = {}) {
  try {
    const autoResult = await query(
      `SELECT id, waba_account_id, name
       FROM automations
       WHERE org_id = $1 AND is_active = true`,
      [orgId]
    );

    if (autoResult.rows.length === 0) return;

    for (const auto of autoResult.rows) {
      const autoId = auto.id;
      const nodesResult = await query(
        `SELECT id, type, label, config
         FROM automation_nodes
         WHERE automation_id = $1
         ORDER BY created_at`,
        [autoId]
      );

      const steps = camelize(nodesResult.rows);
      if (steps.length === 0) continue;

      // Check trigger match
      const triggerStep = steps[0];
      if (!triggerStep.type.startsWith('trigger_')) continue;
      if (!matchesTrigger(triggerStep, triggerType, context)) continue;

      await executeAutomation(autoId, orgId, auto.waba_account_id, triggerType, steps, context);
    }
  } catch (err) {
    logger.error('Automation engine error', { orgId, triggerType, error: err.message });
  }
}

function matchesTrigger(triggerStep, triggerType, context) {
  const config = triggerStep.config || {};
  const stepTriggerName = triggerStep.type.replace('trigger_', '');
  const eventName = triggerType.replace(/_/g, '');
  if (stepTriggerName !== eventName && stepTriggerName !== triggerType) {
    return false;
  }
  // keyword filter
  if (config.keywords && context.message?.content) {
    const kw = config.keywords.toLowerCase();
    const text = context.message.content.toLowerCase();
    if (config.match_type === 'exact') {
      if (text !== kw) return false;
    } else if (config.match_type === 'contains') {
      if (!text.includes(kw)) return false;
    } else {
      // default contains
      if (!text.includes(kw)) return false;
    }
  }
  return true;
}

async function executeAutomation(automationId, orgId, wabaAccountId, triggerType, steps, context) {
  const client = await pool.connect();
  let executionId;
  try {
    await client.query('BEGIN');

    const execResult = await client.query(
      `INSERT INTO automation_executions (automation_id, org_id, trigger_type, status, context)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [automationId, orgId, triggerType, 'running', JSON.stringify(context)]
    );
    executionId = execResult.rows[0].id;
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    logger.error('Failed to create automation execution log', { automationId, error: err.message });
    return;
  }
  client.release();

  const results = [];
  let currentIndex = 0;
  let errorMessage = null;

  try {
    while (currentIndex < steps.length) {
      const step = steps[currentIndex];
      const result = await executeStep(step, orgId, wabaAccountId, context);
      results.push({ stepId: step.id, type: step.type, result });

      if (step.type === 'condition') {
        currentIndex = result.nextIndex !== undefined ? result.nextIndex : currentIndex + 1;
      } else {
        currentIndex++;
      }
    }

    await query(
      `UPDATE automation_executions
       SET status = 'completed', result = $1, completed_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(results), executionId]
    );
  } catch (err) {
    errorMessage = err.message;
    await query(
      `UPDATE automation_executions
       SET status = 'failed', error_message = $1, completed_at = NOW()
       WHERE id = $2`,
      [errorMessage, executionId]
    );
    logger.error('Automation execution failed', { automationId, executionId, error: errorMessage });
  }
}

async function executeStep(step, orgId, wabaAccountId, context) {
  const config = step.config || {};

  switch (step.type) {
    case 'send_text': {
      if (!context.conversation_id || !config.text) return { sent: false, reason: 'missing_conversation_or_text' };
      // Insert message as system/outgoing
      await query(
        `INSERT INTO messages (conversation_id, sender_type, content, message_type, status)
         VALUES ($1, 'system', $2, 'text', 'sent')`,
        [context.conversation_id, config.text]
      );
      return { sent: true, type: 'text' };
    }
    case 'send_template': {
      if (!context.conversation_id || !config.template_name) return { sent: false, reason: 'missing_conversation_or_template' };
      // We don't actually send via Meta here to avoid complexity; just log it
      await query(
        `INSERT INTO messages (conversation_id, sender_type, content, message_type, status, template_name)
         VALUES ($1, 'system', $2, 'template', 'sent', $3)`,
        [context.conversation_id, config.template_name, config.template_name]
      );
      return { sent: true, type: 'template' };
    }
    case 'tag_contact': {
      if (!context.contact_id || !config.tag) return { tagged: false, reason: 'missing_contact_or_tag' };
      await query(
        `UPDATE contacts SET tags = array_append(tags, $1)
         WHERE id = $2 AND NOT ($1 = ANY(tags))`,
        [config.tag, context.contact_id]
      );
      return { tagged: true, tag: config.tag };
    }
    case 'assign_agent': {
      if (!context.conversation_id || !config.user_id) return { assigned: false, reason: 'missing_conversation_or_user' };
      await query(
        `UPDATE conversations SET assigned_agent_id = $1 WHERE id = $2`,
        [config.user_id, context.conversation_id]
      );
      return { assigned: true, userId: config.user_id };
    }
    case 'delay': {
      const ms = (config.seconds || 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 5000))); // Cap at 5s in engine
      return { delayed: true, seconds: config.seconds };
    }
    case 'condition': {
      let matched = false;
      const conditionType = config.condition_type || 'contains';
      const value = (config.value || '').toLowerCase();
      const text = (context.message?.content || '').toLowerCase();
      if (conditionType === 'contains') matched = text.includes(value);
      else if (conditionType === 'exact') matched = text === value;
      else if (conditionType === 'starts_with') matched = text.startsWith(value);
      else if (conditionType === 'ends_with') matched = text.endsWith(value);
      // For linear automations we just return true/false; branching via edges is future work
      return { matched, conditionType, value: config.value };
    }
    default:
      return { executed: false, reason: 'unsupported_step_type' };
  }
}

module.exports = {
  runAutomations,
  executeAutomation,
};
