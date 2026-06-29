const express = require('express');
const { query } = require('../db');
const { authenticate, requirePermission, requireAdmin, resolveWabaAccount } = require('../middleware/auth');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');
const { campaignQueue } = require('../queues');

const router = express.Router();

router.use(authenticate);
router.use(resolveWabaAccount);

// Helper: check if user has access to a campaign's WABA (for agents)
async function checkCampaignAccess(campaignId, user) {
  const perms = user.permissions || [];
  if (perms.includes('settings.manage')) return true;
  const result = await query(
    `SELECT 1 FROM campaigns c
     JOIN agent_waba_access awa ON awa.waba_account_id = c.waba_account_id
     WHERE c.id = $1 AND awa.agent_id = $2`,
    [campaignId, user.id]
  );
  return result.rows.length > 0;
}

// Helper: substitute template variables
function substituteVariables(content, variables) {
  if (!variables || typeof variables !== 'object') return content;
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
  }
  return result;
}

// Helper: extract text content from template components
function extractTemplateContent(components) {
  if (!Array.isArray(components)) return '';
  const bodyComp = components.find((c) => c.type === 'BODY');
  if (bodyComp && bodyComp.text) {
    return bodyComp.text;
  }
  return components
    .filter((c) => c.text)
    .map((c) => c.text)
    .join('\n');
}

// GET / - list campaigns
router.get('/', async (req, res, next) => {
  try {
    let sql = `SELECT id, org_id, waba_account_id, name, message_type, content,
                      template_name, template_variables, status, scheduled_at,
                      started_at, completed_at, total_recipients, sent_count,
                      delivered_count, read_count, failed_count, created_by, created_at
               FROM campaigns WHERE org_id = $1`;
    const params = [req.user.org_id];

    if (req.wabaAccountId) {
      sql += ' AND waba_account_id = $2';
      params.push(req.wabaAccountId);
    }

    // Optional type filter
    if (req.query.type) {
      sql += ` AND message_type = $${params.length + 1}`;
      params.push(req.query.type);
    }

    // Optional status filter
    if (req.query.status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(req.query.status);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json({ campaigns: camelize(result.rows) });
  } catch (err) {
    logger.error('List campaigns error', err);
    next(err);
  }
});

// GET /:id - get single campaign with recipient stats
router.get('/:id', async (req, res, next) => {
  try {
    const campaignResult = await query(
      `SELECT id, org_id, waba_account_id, name, message_type, content,
              template_name, template_variables, status, scheduled_at,
              started_at, completed_at, total_recipients, sent_count,
              delivered_count, read_count, failed_count, created_by, created_at
       FROM campaigns WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];
    const hasAccess = await checkCampaignAccess(req.params.id, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Recipient status breakdown
    const statsResult = await query(
      `SELECT status, COUNT(*) as count FROM campaign_recipients WHERE campaign_id = $1 GROUP BY status`,
      [req.params.id]
    );
    const recipientStats = {};
    for (const row of statsResult.rows) {
      recipientStats[row.status] = parseInt(row.count, 10);
    }

    res.json({
      campaign: camelize(campaign),
      recipientStats,
    });
  } catch (err) {
    logger.error('Get campaign error', err);
    next(err);
  }
});

// POST / - create campaign
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      waba_account_id,
      message_type,
      content: providedContent,
      template_name,
      template_variables,
      template_id,
      recipients,
      scheduled_at,
    } = req.body;

    let content = providedContent;
    let resolvedTemplateName = template_name || null;

    if (!name || !waba_account_id || !message_type || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'name, waba_account_id, message_type, and recipients are required' });
    }

    // If template_id is provided, look up template and validate WABA ownership
    if (template_id) {
      const templateResult = await query(
        'SELECT id, template_name, waba_account_id, components FROM message_templates WHERE id = $1 AND org_id = $2',
        [template_id, req.user.org_id]
      );
      if (templateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      const template = templateResult.rows[0];
      if (template.waba_account_id !== waba_account_id) {
        return res.status(400).json({ error: 'Template does not belong to the selected WABA account' });
      }
      resolvedTemplateName = template.template_name;
      if (!content) {
        content = extractTemplateContent(template.components);
      }
    }

    if (!content) {
      return res.status(400).json({ error: 'content is required when no template_id is provided' });
    }

    // Validate message_type
    if (!['utility', 'marketing'].includes(message_type)) {
      return res.status(400).json({ error: 'message_type must be utility or marketing' });
    }

    // Validate WABA belongs to org
    const wabaCheck = await query(
      'SELECT id FROM waba_accounts WHERE id = $1 AND org_id = $2',
      [waba_account_id, req.user.org_id]
    );
    if (wabaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'WABA account not found' });
    }

    // Agent access check
    if (req.user.role === 'agent') {
      const accessCheck = await query(
        'SELECT 1 FROM agent_waba_access WHERE agent_id = $1 AND waba_account_id = $2',
        [req.user.id, waba_account_id]
      );
      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You do not have access to this WABA account' });
      }
    }

    // Determine initial status
    let status = 'draft';
    let scheduledAt = null;
    if (scheduled_at) {
      const scheduleDate = new Date(scheduled_at);
      if (scheduleDate > new Date()) {
        status = 'scheduled';
        scheduledAt = scheduleDate.toISOString();
      } else {
        status = 'running';
        scheduledAt = scheduleDate.toISOString();
      }
    }

    // Insert campaign
    const campaignResult = await query(
      `INSERT INTO campaigns (org_id, waba_account_id, name, message_type, content,
                              template_name, template_variables, status, scheduled_at,
                              total_recipients, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        req.user.org_id,
        waba_account_id,
        name,
        message_type,
        content,
        resolvedTemplateName,
        JSON.stringify(template_variables || []),
        status,
        scheduledAt,
        recipients.length,
        req.user.id,
      ]
    );
    const campaignId = campaignResult.rows[0].id;

    // Insert recipients
    for (const r of recipients) {
      await query(
        `INSERT INTO campaign_recipients (campaign_id, contact_id, phone, status)
         VALUES ($1, $2, $3, 'pending')`,
        [campaignId, r.contact_id || null, r.phone]
      );
    }

    // If past-due scheduled, start immediately
    if (status === 'running') {
      await query("UPDATE campaigns SET started_at = NOW() WHERE id = $1", [campaignId]);
      await campaignQueue.add('send-campaign-batch', {
        campaignId,
        orgId: req.user.org_id,
        wabaAccountId: waba_account_id,
      });
    }

    // If scheduled for future, enqueue schedule job
    if (status === 'scheduled') {
      const delay = new Date(scheduledAt).getTime() - Date.now();
      await campaignQueue.add('schedule-campaign', {
        campaignId,
        orgId: req.user.org_id,
        wabaAccountId: waba_account_id,
      }, { delay: Math.max(delay, 0) });
    }

    res.status(201).json({
      campaign: {
        id: campaignId,
        name,
        messageType: message_type,
        status,
        totalRecipients: recipients.length,
        templateName: resolvedTemplateName,
      },
    });
  } catch (err) {
    logger.error('Create campaign error', err);
    next(err);
  }
});

// PUT /:id - update draft or scheduled campaign
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT status, waba_account_id FROM campaigns WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const { status: currentStatus, waba_account_id: campaignWabaId } = existing.rows[0];
    if (!['draft', 'scheduled'].includes(currentStatus)) {
      return res.status(400).json({ error: 'Cannot update campaign that is already running, completed, or cancelled' });
    }

    const hasAccess = await checkCampaignAccess(req.params.id, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, content, template_name, template_variables, scheduled_at } = req.body;

    // Handle schedule changes
    let newStatus = currentStatus;
    let newScheduledAt = null;
    if (scheduled_at !== undefined) {
      const scheduleDate = new Date(scheduled_at);
      if (scheduleDate > new Date()) {
        newStatus = 'scheduled';
        newScheduledAt = scheduleDate.toISOString();
      } else {
        newStatus = 'running';
        newScheduledAt = scheduleDate.toISOString();
      }
    }

    const result = await query(
      `UPDATE campaigns
       SET name = COALESCE($1, name),
           content = COALESCE($2, content),
           template_name = COALESCE($3, template_name),
           template_variables = COALESCE($4, template_variables),
           status = COALESCE($5, status),
           scheduled_at = COALESCE($6, scheduled_at)
       WHERE id = $7 AND org_id = $8
       RETURNING *`,
      [name, content, template_name, template_variables ? JSON.stringify(template_variables) : null, newStatus, newScheduledAt, req.params.id, req.user.org_id]
    );

    // If transitioning to running, start it
    if (currentStatus !== 'running' && newStatus === 'running') {
      await query("UPDATE campaigns SET started_at = NOW() WHERE id = $1", [req.params.id]);
      await campaignQueue.add('send-campaign-batch', {
        campaignId: req.params.id,
        orgId: req.user.org_id,
        wabaAccountId: campaignWabaId,
      });
    }

    res.json({ campaign: camelize(result.rows[0]) });
  } catch (err) {
    logger.error('Update campaign error', err);
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT status, waba_account_id FROM campaigns WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const { status: currentStatus } = existing.rows[0];
    if (!['draft', 'cancelled'].includes(currentStatus)) {
      return res.status(400).json({ error: 'Cannot delete campaign unless it is draft or cancelled' });
    }

    await query('DELETE FROM campaigns WHERE id = $1 AND org_id = $2', [req.params.id, req.user.org_id]);
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    logger.error('Delete campaign error', err);
    next(err);
  }
});

// POST /:id/start - start a draft campaign immediately
router.post('/:id/start', requirePermission('campaigns.manage'), async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT status, waba_account_id FROM campaigns WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const { status: currentStatus, waba_account_id: wabaId } = existing.rows[0];
    if (currentStatus !== 'draft') {
      return res.status(400).json({ error: 'Campaign must be in draft status to start' });
    }

    await query(
      "UPDATE campaigns SET status = 'running', started_at = NOW(), scheduled_at = NULL WHERE id = $1",
      [req.params.id]
    );

    await campaignQueue.add('send-campaign-batch', {
      campaignId: req.params.id,
      orgId: req.user.org_id,
      wabaAccountId: wabaId,
    });

    res.json({ message: 'Campaign started' });
  } catch (err) {
    logger.error('Start campaign error', err);
    next(err);
  }
});

// POST /:id/pause
router.post('/:id/pause', requirePermission('campaigns.manage'), async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE campaigns SET status = 'paused' WHERE id = $1 AND org_id = $2 AND status = 'running' RETURNING id",
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Campaign not found or not running' });
    }
    res.json({ message: 'Campaign paused' });
  } catch (err) {
    logger.error('Pause campaign error', err);
    next(err);
  }
});

// POST /:id/resume
router.post('/:id/resume', requirePermission('campaigns.manage'), async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT status, waba_account_id FROM campaigns WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const { status: currentStatus, waba_account_id: wabaId } = existing.rows[0];
    if (currentStatus !== 'paused') {
      return res.status(400).json({ error: 'Campaign must be paused to resume' });
    }

    await query(
      "UPDATE campaigns SET status = 'running' WHERE id = $1",
      [req.params.id]
    );

    await campaignQueue.add('send-campaign-batch', {
      campaignId: req.params.id,
      orgId: req.user.org_id,
      wabaAccountId: wabaId,
    });

    res.json({ message: 'Campaign resumed' });
  } catch (err) {
    logger.error('Resume campaign error', err);
    next(err);
  }
});

// POST /:id/cancel
router.post('/:id/cancel', requirePermission('campaigns.manage'), async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE campaigns SET status = 'cancelled', completed_at = NOW() WHERE id = $1 AND org_id = $2 AND status IN ('running', 'paused', 'scheduled', 'draft') RETURNING id",
      [req.params.id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Campaign not found or cannot be cancelled' });
    }
    res.json({ message: 'Campaign cancelled' });
  } catch (err) {
    logger.error('Cancel campaign error', err);
    next(err);
  }
});

// GET /:id/recipients - paginated recipient list
router.get('/:id/recipients', async (req, res, next) => {
  try {
    const hasAccess = await checkCampaignAccess(req.params.id, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const countResult = await query(
      'SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = $1',
      [req.params.id]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(
      `SELECT id, campaign_id, contact_id, phone, status, external_id, error_message, sent_at, created_at
       FROM campaign_recipients
       WHERE campaign_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    res.json({
      recipients: camelize(result.rows),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('List campaign recipients error', err);
    next(err);
  }
});

module.exports = { router, substituteVariables };
