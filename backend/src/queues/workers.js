const { Worker } = require('bullmq');
const config = require('../config');
const whatsappService = require('../services/whatsapp');
const { query } = require('../db');
const logger = require('../utils/logger');
const { sendNotification: sendGoogleChatNotification } = require('../utils/googleChat');

const connection = {
  url: config.redisUrl,
};

let messageWorker = null;

try {
  messageWorker = new Worker(
    'messageQueue',
    async (job) => {
      if (job.name === 'send-whatsapp-message') {
        await whatsappService.sendMessage(job.data);
      }
    },
    { connection }
  );

  messageWorker.on('completed', (job) => {
    logger.info(`Message job completed: ${job.id}`);
  });

  messageWorker.on('failed', (job, err) => {
    logger.error(`Message job failed: ${job.id}`, err);
  });

  messageWorker.on('error', (err) => {
    logger.error('Message worker error', err);
  });
} catch (err) {
  logger.error('Failed to start message worker — Redis may be unavailable', err.message);
}

let analyticsWorker = null;

try {
  analyticsWorker = new Worker(
    'analyticsQueue',
    async (job) => {
      if (job.name === 'aggregate-analytics') {
        const { orgId } = job.data;
        const result = await query(
          `SELECT DATE(m.created_at) as day, COUNT(*) as count
           FROM messages m
           JOIN conversations c ON c.id = m.conversation_id
           WHERE c.org_id = $1
           GROUP BY DATE(m.created_at)
           ORDER BY day DESC
           LIMIT 30`,
          [orgId]
        );
        logger.info(`Analytics aggregated for org ${orgId}`, { rows: result.rows.length });
      }
    },
    { connection }
  );

  analyticsWorker.on('completed', (job) => {
    logger.info(`Analytics job completed: ${job.id}`);
  });

  analyticsWorker.on('failed', (job, err) => {
    logger.error(`Analytics job failed: ${job.id}`, err);
  });

  analyticsWorker.on('error', (err) => {
    logger.error('Analytics worker error', err);
  });
} catch (err) {
  logger.error('Failed to start analytics worker — Redis may be unavailable', err.message);
}

function substituteVariables(content, variables) {
  if (!variables || typeof variables !== 'object') return content;
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
  }
  return result;
}

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

let campaignWorker = null;

try {
  campaignWorker = new Worker(
    'campaignQueue',
    async (job) => {
      if (job.name === 'schedule-campaign') {
        const { campaignId, orgId, wabaAccountId } = job.data;
        logger.info(`Scheduling campaign ${campaignId}`);

        const campaignResult = await query(
          "SELECT status FROM campaigns WHERE id = $1 AND org_id = $2",
          [campaignId, orgId]
        );
        if (campaignResult.rows.length === 0) return;
        if (campaignResult.rows[0].status !== 'scheduled') return;

        await query(
          "UPDATE campaigns SET status = 'running', started_at = NOW() WHERE id = $1",
          [campaignId]
        );

        await campaignQueue.add('send-campaign-batch', {
          campaignId,
          orgId,
          wabaAccountId,
        });
        return;
      }

      if (job.name === 'send-campaign-batch') {
        const { campaignId, orgId, wabaAccountId } = job.data;

        // Check campaign status
        const campaignResult = await query(
          `SELECT status, message_type, content, template_name, template_variables,
                  sent_count, total_recipients
           FROM campaigns WHERE id = $1 AND org_id = $2`,
          [campaignId, orgId]
        );
        if (campaignResult.rows.length === 0) {
          logger.warn(`Campaign ${campaignId} not found during batch processing`);
          return;
        }

        const campaign = campaignResult.rows[0];
        if (campaign.status === 'paused' || campaign.status === 'cancelled') {
          logger.info(`Campaign ${campaignId} is ${campaign.status}, stopping batch processing`);
          return;
        }
        if (campaign.status !== 'running') {
          logger.info(`Campaign ${campaignId} is not running (${campaign.status}), skipping batch`);
          return;
        }

        // Get WABA credentials
        const wabaResult = await query(
          'SELECT phone_number_id, access_token FROM waba_accounts WHERE id = $1 AND org_id = $2',
          [wabaAccountId, orgId]
        );
        if (wabaResult.rows.length === 0) {
          logger.error(`WABA account ${wabaAccountId} not found for campaign ${campaignId}`);
          return;
        }
        const { phone_number_id: phoneNumberId, access_token: accessToken } = wabaResult.rows[0];

        // Fetch pending recipients
        const recipientsResult = await query(
          `SELECT id, phone, status FROM campaign_recipients
           WHERE campaign_id = $1 AND status = 'pending'
           LIMIT $2`,
          [campaignId, BATCH_SIZE]
        );

        if (recipientsResult.rows.length === 0) {
          // No more recipients - mark completed
          await query(
            "UPDATE campaigns SET status = 'completed', completed_at = NOW() WHERE id = $1",
            [campaignId]
          );
          logger.info(`Campaign ${campaignId} completed`);

          // Google Chat notification
          try {
            const campaignName = campaign.name || 'Unnamed Campaign';
            const userResult = await query('SELECT name FROM users WHERE id = $1', [campaign.created_by]);
            const creatorName = userResult.rows[0]?.name || 'System';
            sendGoogleChatNotification({
              taskName: campaignName,
              taskId: campaignId,
              user: creatorName,
              status: 'completed',
              details: `All recipients processed. Sent: ${campaign.sent_count || 0}`,
            });
          } catch (notifErr) {
            logger.warn('Google Chat notification skipped for campaign', { error: notifErr.message });
          }
          return;
        }

        const templateVars = campaign.template_variables || [];
        const hasTemplate = !!campaign.template_name;

        // Look up template language if this is a Meta template campaign
        let templateLanguage = 'en';
        if (hasTemplate) {
          const langResult = await query(
            'SELECT language FROM message_templates WHERE template_name = $1 AND waba_account_id = $2 AND org_id = $3 LIMIT 1',
            [campaign.template_name, wabaAccountId, orgId]
          );
          if (langResult.rows.length > 0) {
            templateLanguage = langResult.rows[0].language;
          }
        }

        for (const recipient of recipientsResult.rows) {
          // Mark as queued
          await query(
            "UPDATE campaign_recipients SET status = 'queued' WHERE id = $1",
            [recipient.id]
          );

          const jobPayload = {
            phoneNumberId,
            accessToken,
            to: recipient.phone,
            campaignRecipientId: recipient.id,
            campaignId,
            isCampaignMessage: true,
          };

          if (hasTemplate) {
            // Send as actual Meta template message
            jobPayload.messageType = 'template';
            jobPayload.templateName = campaign.template_name;
            jobPayload.templateLanguage = templateLanguage;
            jobPayload.templateVariables = Array.isArray(templateVars) ? templateVars : [];
          } else {
            // Build personalized text content
            const variables = {};
            if (Array.isArray(templateVars)) {
              for (const v of templateVars) variables[v] = '';
            }
            jobPayload.content = substituteVariables(campaign.content, variables);
            jobPayload.messageType = 'text';
          }

          await messageQueue.add('send-whatsapp-message', jobPayload);
        }

        // Update sent_count (queued count)
        const newSentCount = parseInt(campaign.sent_count, 10) + recipientsResult.rows.length;
        await query(
          'UPDATE campaigns SET sent_count = $1 WHERE id = $2',
          [newSentCount, campaignId]
        );

        // Check if there are more pending recipients
        const remainingResult = await query(
          `SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = $1 AND status = 'pending'`,
          [campaignId]
        );
        const remaining = parseInt(remainingResult.rows[0].count, 10);

        if (remaining > 0) {
          // Enqueue next batch with delay for rate limiting
          await campaignQueue.add(
            'send-campaign-batch',
            { campaignId, orgId, wabaAccountId },
            { delay: BATCH_DELAY_MS }
          );
        } else {
          // All queued, but we need to wait for delivery confirmations before marking complete.
          // For simplicity, mark as completed. In production, you'd wait for webhook statuses.
          await query(
            "UPDATE campaigns SET status = 'completed', completed_at = NOW() WHERE id = $1",
            [campaignId]
          );
          logger.info(`Campaign ${campaignId} completed (all recipients queued)`);

          // Google Chat notification
          try {
            const campaignName = campaign.name || 'Unnamed Campaign';
            const userResult = await query('SELECT name FROM users WHERE id = $1', [campaign.created_by]);
            const creatorName = userResult.rows[0]?.name || 'System';
            sendGoogleChatNotification({
              taskName: campaignName,
              taskId: campaignId,
              user: creatorName,
              status: 'completed',
              details: `All recipients queued. Total sent: ${newSentCount}`,
            });
          } catch (notifErr) {
            logger.warn('Google Chat notification skipped for campaign', { error: notifErr.message });
          }
        }
      }
    },
    { connection }
  );

  campaignWorker.on('completed', (job) => {
    logger.info(`Campaign job completed: ${job.id} (${job.name})`);
  });

  campaignWorker.on('failed', (job, err) => {
    logger.error(`Campaign job failed: ${job.id}`, err);
  });

  campaignWorker.on('error', (err) => {
    logger.error('Campaign worker error', err);
  });
} catch (err) {
  logger.error('Failed to start campaign worker — Redis may be unavailable', err.message);
}

module.exports = {
  messageWorker,
  analyticsWorker,
  campaignWorker,
};
