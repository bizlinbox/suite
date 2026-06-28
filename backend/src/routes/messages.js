const express = require('express');
const { query } = require('../db');
const { authenticate, resolveWabaAccount } = require('../middleware/auth');
const { messageQueue } = require('../queues');
const logger = require('../utils/logger');
const camelize = require('../utils/camelize');
const { emitToConversation, emitToOrg } = require('../services/socket');

const router = express.Router();

router.use(authenticate);
router.use(resolveWabaAccount);

function isAdmin(req) {
  const perms = req.user?.permissions || [];
  return perms.includes('users.manage');
}

// Helper to check conversation access including private restriction
async function checkConversationAccess(req, conversation_id) {
  let sql = `SELECT c.id, c.assigned_agent_id, c.is_private, c.waba_account_id, con.phone as contact_phone FROM conversations c JOIN contacts con ON con.id = c.contact_id WHERE c.id = $1 AND c.org_id = $2`;
  const params = [conversation_id, req.user.org_id];
  if (req.wabaAccountId) {
    sql += ` AND waba_account_id = $3`;
    params.push(req.wabaAccountId);
  }
  const result = await query(sql, params);
  if (result.rows.length === 0) {
    return { allowed: false, reason: 'Conversation not found' };
  }
  const conv = result.rows[0];
  if (conv.is_private && !isAdmin(req) && conv.assigned_agent_id !== req.user.id) {
    return { allowed: false, reason: 'Conversation not found' };
  }
  return { allowed: true, conversation: conv };
}

// GET /?conversation_id=... - list messages for a conversation
router.get('/', async (req, res, next) => {
  try {
    const conversation_id = req.query.conversation_id || req.query.conversationId;
    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    const access = await checkConversationAccess(req, conversation_id);
    if (!access.allowed) {
      return res.status(404).json({ error: access.reason });
    }

    let msgSql = `SELECT m.id, m.conversation_id, m.sender_type, m.content, m.media_url, m.media_mime_type, m.filename, m.voice, m.message_type, m.status, m.external_id, m.error_message, m.reaction_to_message_id, m.created_at
                  FROM messages m
                  JOIN conversations c ON c.id = m.conversation_id
                  WHERE m.conversation_id = $1 AND c.org_id = $2`;
    const msgParams = [conversation_id, req.user.org_id];
    if (req.wabaAccountId) {
      msgSql += ' AND c.waba_account_id = $3';
      msgParams.push(req.wabaAccountId);
    }
    msgSql += ' ORDER BY m.created_at ASC';

    const result = await query(msgSql, msgParams);
    res.json({ messages: camelize(result.rows) });
  } catch (err) {
    logger.error('List messages error', err);
    next(err);
  }
});

// POST / - send message (enqueue BullMQ job)
router.post('/', async (req, res, next) => {
  try {
    const body = req.body;
    const conversation_id = body.conversation_id || body.conversationId;
    const content = body.content;
    const message_type = body.message_type || body.messageType || 'text';
    const media_url = body.media_url || body.mediaUrl;
    const address_options = body.address_options || body.addressOptions;
    const contactsData = body.contacts || body.contactsData;
    const ctaUrlOptions = body.cta_url_options || body.ctaUrlOptions;
    const listOptions = body.list_options || body.listOptions;
    const productListOptions = body.product_list_options || body.productListOptions;
    const replyButtonsOptions = body.reply_buttons_options || body.replyButtonsOptions;
    const locationOptions = body.location_options || body.locationOptions;
    const locationRequestOptions = body.location_request_options || body.locationRequestOptions;
    const reactionOptions = body.reaction_options || body.reactionOptions;
    const preview_url = body.preview_url || body.previewUrl;
    const filename = body.filename;
    const voice = body.voice;
    const media_mime_type = body.media_mime_type || body.mediaMimeType;
    const template_name = body.template_name || body.templateName;
    const template_language = body.template_language || body.templateLanguage;
    const template_variables = body.template_variables || body.templateVariables;

    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }
    if (message_type === 'template' && !template_name) {
      return res.status(400).json({ error: 'template_name is required for template type' });
    }
    if (message_type === 'address_message' && !address_options) {
      return res.status(400).json({ error: 'address_options is required for address_message type' });
    }
    if (message_type === 'cta_url' && (!ctaUrlOptions || !ctaUrlOptions.url)) {
      return res.status(400).json({ error: 'cta_url_options with url is required for cta_url type' });
    }
    if (message_type === 'list' && (!listOptions || !Array.isArray(listOptions.sections))) {
      return res.status(400).json({ error: 'list_options with sections array is required for list type' });
    }
    if (message_type === 'product_list' && (!productListOptions || !productListOptions.catalog_id || !Array.isArray(productListOptions.sections))) {
      return res.status(400).json({ error: 'product_list_options with catalog_id and sections is required for product_list type' });
    }
    if (message_type === 'button' && (!replyButtonsOptions || !Array.isArray(replyButtonsOptions.buttons) || replyButtonsOptions.buttons.length === 0)) {
      return res.status(400).json({ error: 'reply_buttons_options with at least one button is required for button type' });
    }
    if (message_type === 'location' && (!locationOptions || locationOptions.latitude == null || locationOptions.longitude == null)) {
      return res.status(400).json({ error: 'location_options with latitude and longitude is required for location type' });
    }
    if (message_type === 'reaction' && (!reactionOptions || !reactionOptions.target_message_id || !reactionOptions.emoji)) {
      return res.status(400).json({ error: 'reaction_options with message_id and emoji is required for reaction type' });
    }
    if (message_type === 'sticker' && !media_url) {
      return res.status(400).json({ error: 'media_url is required for sticker type' });
    }
    if (message_type === 'contacts' && (!contactsData || !Array.isArray(contactsData))) {
      return res.status(400).json({ error: 'contacts array is required for contacts message type' });
    }
    if (!content && !media_url && message_type !== 'address_message' && message_type !== 'contacts' && message_type !== 'cta_url' && message_type !== 'list' && message_type !== 'product_list' && message_type !== 'button' && message_type !== 'location' && message_type !== 'location_request_message' && message_type !== 'reaction' && message_type !== 'template') {
      return res.status(400).json({ error: 'content or media_url is required' });
    }

    const access = await checkConversationAccess(req, conversation_id);
    if (!access.allowed) {
      return res.status(404).json({ error: access.reason });
    }

    const conv = access.conversation;

    // For reactions, look up target message external_id
    let reactionToMessageId = null;
    let reactionTargetExternalId = null;
    if (message_type === 'reaction' && reactionOptions) {
      const targetResult = await query(
        'SELECT id, external_id FROM messages WHERE id = $1 AND conversation_id = $2',
        [reactionOptions.target_message_id, conversation_id]
      );
      if (targetResult.rows.length > 0) {
        reactionToMessageId = targetResult.rows[0].id;
        reactionTargetExternalId = targetResult.rows[0].external_id;
      }
    }

    // Save message in DB
    const msgResult = await query(
      `INSERT INTO messages (conversation_id, sender_type, content, media_url, message_type, filename, voice, status, reaction_to_message_id)
       VALUES ($1, 'agent', $2, $3, $4, $5, $6, 'sent', $7)
       RETURNING id, conversation_id, sender_type, content, media_url, message_type, filename, voice, status, reaction_to_message_id, created_at`,
      [conversation_id, content, media_url, message_type, filename, voice || false, reactionToMessageId]
    );
    const message = msgResult.rows[0];

    // Update conversation last_message_at
    await query(
      'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
      [conversation_id]
    );

    // Emit real-time events
    // Emit new_message to both the conversation room and org so all agents get real-time updates
    emitToConversation(req.user.org_id, conversation_id, 'new_message', camelize(message));
    emitToOrg(req.user.org_id, 'new_message', camelize(message));
    emitToOrg(req.user.org_id, 'conversation_updated', camelize({
      conversation_id: conversation_id,
      last_message_at: message.created_at,
      last_message_preview: message.content || '',
    }));

    // Look up WABA account credentials
    let phoneNumberId = null;
    let accessToken = null;
    if (conv.waba_account_id) {
      const wabaResult = await query(
        'SELECT phone_number_id, access_token FROM waba_accounts WHERE id = $1 AND org_id = $2',
        [conv.waba_account_id, req.user.org_id]
      );
      if (wabaResult.rows.length > 0) {
        phoneNumberId = wabaResult.rows[0].phone_number_id;
        accessToken = wabaResult.rows[0].access_token;
      }
    }

    // Enqueue job to send via WhatsApp
    if (phoneNumberId && accessToken && conv.contact_phone) {
      const jobData = {
        phoneNumberId: phoneNumberId,
        accessToken: accessToken,
        to: conv.contact_phone,
        content,
        mediaUrl: media_url,
        mediaMimeType: media_mime_type,
        messageType: message_type,
        messageId: message.id,
        wabaAccountId: conv.waba_account_id || null,
        orgId: req.user.org_id,
        conversationId: conversation_id,
      };
      if (voice) {
        jobData.voice = voice;
      }
      if (message_type === 'address_message' && address_options) {
        jobData.addressOptions = address_options;
      }
      if (message_type === 'cta_url' && ctaUrlOptions) {
        jobData.ctaUrlOptions = ctaUrlOptions;
      }
      if (message_type === 'list' && listOptions) {
        jobData.listOptions = listOptions;
      }
      if (message_type === 'product_list' && productListOptions) {
        jobData.productListOptions = productListOptions;
      }
      if (message_type === 'button' && replyButtonsOptions) {
        jobData.replyButtonsOptions = replyButtonsOptions;
      }
      if (message_type === 'location' && locationOptions) {
        jobData.locationOptions = locationOptions;
      }
      if (message_type === 'location_request_message' && locationRequestOptions) {
        jobData.locationRequestOptions = locationRequestOptions;
      }
      if (message_type === 'reaction' && reactionOptions && reactionTargetExternalId) {
        jobData.reactionOptions = {
          message_id: reactionTargetExternalId,
          emoji: reactionOptions.emoji,
        };
      }
      if (message_type === 'text' && preview_url === true) {
        jobData.previewUrl = true;
      }
      if (message_type === 'contacts' && contactsData) {
        jobData.contactsData = contactsData;
      }
      if (filename) {
        jobData.filename = filename;
      }
      if (message_type === 'template') {
        jobData.templateName = template_name;
        jobData.templateLanguage = template_language || 'en';
        if (template_variables) {
          jobData.templateVariables = template_variables;
        }
      }
      await messageQueue.add('send-whatsapp-message', jobData);
    }

    res.status(201).json({ message: camelize(message) });
  } catch (err) {
    logger.error('Send message error', err);
    next(err);
  }
});

// GET /template-window/:conversationId - check if 24h conversation window is open
router.get('/template-window/:conversationId', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const access = await checkConversationAccess(req, conversationId);
    if (!access.allowed) {
      return res.status(404).json({ error: access.reason });
    }

    // Find the most recent incoming (contact) message in this conversation
    const result = await query(
      `SELECT created_at FROM messages
       WHERE conversation_id = $1 AND sender_type = 'contact'
       ORDER BY created_at DESC
       LIMIT 1`,
      [conversationId]
    );

    const lastIncoming = result.rows[0]?.created_at;
    const now = new Date();
    const windowOpen = lastIncoming
      ? new Date(lastIncoming).getTime() > now.getTime() - 24 * 60 * 60 * 1000
      : false;

    res.json({
      windowOpen,
      lastIncomingMessageAt: lastIncoming || null,
    });
  } catch (err) {
    logger.error('Template window check error', err);
    next(err);
  }
});

module.exports = router;
