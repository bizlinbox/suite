const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { query } = require('../db');
const logger = require('../utils/logger');
const { emitToOrg, emitToConversation } = require('../services/socket');
const config = require('../config');
const camelize = require('../utils/camelize');

const router = express.Router();

const META_API_BASE = `https://graph.facebook.com/${config.whatsappApiVersion}`;

/**
 * Download media from Meta's WhatsApp Cloud API
 */
async function downloadMedia(mediaId, accessToken, orgId) {
  try {
    // Step 1: Get temporary download URL from Meta
    const metaRes = await axios.get(`${META_API_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const downloadUrl = metaRes.data.url;
    const mimeType = metaRes.data.mime_type || 'application/octet-stream';

    // Step 2: Download actual file
    const fileRes = await axios.get(downloadUrl, {
      responseType: 'stream',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Step 3: Save to local uploads
    const ext = mimeType.split('/')[1] || 'bin';
    const fileName = `${Date.now()}_${mediaId}.${ext}`;
    const relativePath = path.join('whatsapp_media', String(orgId), fileName);
    const absolutePath = path.join(config.uploadDir, relativePath);

    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const writer = fs.createWriteStream(absolutePath);
    fileRes.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    return { localPath: relativePath, mimeType };
  } catch (err) {
    logger.error('Media download failed', { mediaId, error: err.message });
    return null;
  }
}

/**
 * GET /api/v1/webhooks - Meta webhook verification
 * Meta sends this when configuring the webhook callback URL.
 * The callback URL includes ?waba_id={id} so we validate per-WABA.
 */
router.get('/', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const wabaId = req.query.waba_id;

  logger.info('Webhook verification request received', {
    mode,
    wabaId,
    hasToken: !!token,
    hasChallenge: !!challenge,
    ip: req.ip,
  });

  if (!wabaId) {
    logger.warn('Webhook verification missing waba_id');
    return res.status(400).json({ error: 'waba_id query param is required' });
  }

  try {
    const wabaResult = await query(
      'SELECT webhook_verify_token FROM waba_accounts WHERE id = $1',
      [wabaId]
    );
    if (wabaResult.rows.length === 0) {
      logger.warn('Webhook verification: WABA not found', { wabaId });
      return res.sendStatus(403);
    }

    const expectedToken = wabaResult.rows[0].webhook_verify_token;
    if (!expectedToken) {
      logger.warn('Webhook verification: token not set for WABA', { wabaId });
      return res.sendStatus(403);
    }

    if (mode === 'subscribe' && token === expectedToken) {
      logger.info('Webhook verified successfully', { wabaId });
      return res.status(200).send(challenge);
    }

    logger.warn('Webhook verification failed', {
      mode,
      wabaId,
      tokenMatch: token === expectedToken,
      tokenLength: token?.length,
      expectedLength: expectedToken.length,
    });
    res.sendStatus(403);
  } catch (err) {
    logger.error('Webhook verification error', { error: err.message });
    res.sendStatus(500);
  }
});

/**
 * POST /api/v1/webhooks - Receive messages and events from Meta
 */
router.post('/', async (req, res) => {
  // Acknowledge immediately — Meta expects a 200 within 20 seconds
  res.sendStatus(200);

  try {
    const body = req.body;
    const urlWabaId = req.query.waba_id;
    if (!body.entry || !Array.isArray(body.entry)) {
      logger.debug('Webhook received empty entry');
      return;
    }

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        // Look up the WABA account for this phone_number_id
        const wabaResult = await query(
          'SELECT id, org_id, access_token FROM waba_accounts WHERE phone_number_id = $1 AND is_active = true',
          [phoneNumberId]
        );
        if (wabaResult.rows.length === 0) {
          logger.warn('Received webhook for unregistered phone_number_id', { phoneNumberId });
          continue;
        }

        const wabaAccount = wabaResult.rows[0];
        if (urlWabaId && wabaAccount.id !== urlWabaId) {
          logger.warn('Webhook waba_id mismatch', { urlWabaId, actualWabaId: wabaAccount.id });
          continue;
        }

        const orgId = wabaAccount.org_id;
        const accessToken = wabaAccount.access_token;
        const wabaAccountId = wabaAccount.id;

        // Process incoming messages
        const contactProfile = (value.contacts || [])[0]?.profile || {};
        for (const msg of value.messages || []) {
          await handleIncomingMessage(orgId, msg, phoneNumberId, accessToken, contactProfile, wabaAccountId);
        }

        // Process message statuses (sent, delivered, read, failed)
        for (const status of value.statuses || []) {
          await handleStatusUpdate(status, orgId);
        }

        // Process errors delivered via webhook
        for (const error of value.errors || []) {
          logger.error('Webhook error payload', { error, phoneNumberId });
        }
      }
    }
  } catch (err) {
    logger.error('Webhook processing error', { error: err.message, stack: err.stack });
  }
});

async function handleIncomingMessage(orgId, msg, phoneNumberId, accessToken, contactProfile = {}, wabaAccountId = null) {
  const from = msg.from;
  const externalId = msg.id;
  const timestamp = msg.timestamp ? new Date(parseInt(msg.timestamp, 10) * 1000) : new Date();

  let content = '';
  let messageType = 'text';
  let mediaUrl = null;
  let mediaMimeType = null;
  let voice = false;

  try {
    if (msg.text) {
      content = msg.text.body;
      messageType = 'text';
    } else if (msg.image) {
      content = msg.image.caption || '';
      messageType = 'image';
      const downloaded = await downloadMedia(msg.image.id, accessToken, orgId);
      if (downloaded) {
        mediaUrl = downloaded.localPath;
        mediaMimeType = downloaded.mimeType;
      }
    } else if (msg.document) {
      // Preserve both caption and filename when present
      const docCaption = msg.document.caption || '';
      const docFilename = msg.document.filename || '';
      if (docCaption && docFilename) {
        content = `${docCaption} (${docFilename})`;
      } else {
        content = docCaption || docFilename || '';
      }
      messageType = 'document';
      const downloaded = await downloadMedia(msg.document.id, accessToken, orgId);
      if (downloaded) {
        mediaUrl = downloaded.localPath;
        mediaMimeType = downloaded.mimeType;
      }
    } else if (msg.audio) {
      // Meta audio messages do not include caption; use voice flag to distinguish recordings
      content = msg.audio.voice ? 'Voice message' : 'Audio message';
      messageType = 'audio';
      voice = msg.audio.voice === true;
      const downloaded = await downloadMedia(msg.audio.id, accessToken, orgId);
      if (downloaded) {
        mediaUrl = downloaded.localPath;
        mediaMimeType = downloaded.mimeType;
      }
    } else if (msg.video) {
      content = msg.video.caption || '';
      messageType = 'video';
      const downloaded = await downloadMedia(msg.video.id, accessToken, orgId);
      if (downloaded) {
        mediaUrl = downloaded.localPath;
        mediaMimeType = downloaded.mimeType;
      }
    } else if (msg.sticker) {
      content = '';
      messageType = 'sticker';
      const downloaded = await downloadMedia(msg.sticker.id, accessToken, orgId);
      if (downloaded) {
        mediaUrl = downloaded.localPath;
        mediaMimeType = downloaded.mimeType;
      }
    } else if (msg.location) {
      content = `${msg.location.latitude},${msg.location.longitude}`;
      if (msg.location.name) content += ` — ${msg.location.name}`;
      if (msg.location.address) content += ` (${msg.location.address})`;
      messageType = 'location';
    } else if (msg.contacts) {
      content = (msg.contacts || [])
        .map((c) => {
          const phones = (c.phones || []).map((p) => p.phone).join(', ');
          return `${c.name?.formatted_name || ''}: ${phones}`;
        })
        .join('; ');
      messageType = 'contacts';
    } else if (msg.reaction) {
      content = msg.reaction.emoji || '';
      messageType = 'reaction';
    } else if (msg.interactive) {
      if (msg.interactive.type === 'nfm_reply' && msg.interactive.nfm_reply) {
        // Native flow reply — e.g. address message response
        const nfm = msg.interactive.nfm_reply;
        content = nfm.body || JSON.stringify(nfm);
        messageType = 'nfm_reply';

        // Handle address message response
        if (nfm.response_json) {
          try {
            const responseData = typeof nfm.response_json === 'string'
              ? JSON.parse(nfm.response_json)
              : nfm.response_json;

            if (responseData.values) {
              const addr = responseData.values;
              // Store address — will be saved after contact upsert below
              msg._extractedAddress = {
                street: addr.address?.trim() || addr.street?.trim() || null,
                city: addr.city?.trim() || null,
                state: addr.state?.trim() || null,
                zip: addr.zip?.trim() || addr.postal_code?.trim() || null,
                country: addr.country?.trim() || null,
                country_code: addr.country_code?.trim() || null,
                type: 'HOME',
              };
              content = `Address received: ${addr.address?.trim() || ''}, ${addr.city?.trim() || ''}, ${addr.state?.trim() || ''} ${addr.zip?.trim() || ''}, ${addr.country?.trim() || ''}`.replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim();
            }
          } catch (parseErr) {
            logger.warn('Failed to parse nfm_reply response_json', { error: parseErr.message, responseJson: nfm.response_json });
          }
        }
      } else if (msg.interactive.button_reply) {
        content = msg.interactive.button_reply.title || '';
        messageType = 'button_reply';
      } else if (msg.interactive.list_reply) {
        const lr = msg.interactive.list_reply;
        const parts = [lr.title || ''];
        if (lr.id) parts.push(`id:${lr.id}`);
        if (lr.description) parts.push(lr.description);
        content = parts.join(' | ');
        messageType = 'list_reply';
      } else {
        content = JSON.stringify(msg.interactive);
        messageType = 'interactive';
      }
    } else if (msg.order) {
      content = `Order: ${msg.order.catalog_id || ''} — ${(msg.order.product_items || []).length} items`;
      messageType = 'order';
    } else if (msg.system) {
      // System messages (group events, security codes, etc.) — usually skip or log only
      content = msg.system.body || JSON.stringify(msg.system);
      messageType = 'system';
    } else if (msg.button) {
      content = msg.button.text || '';
      messageType = 'button';
    } else {
      content = JSON.stringify(msg);
      messageType = 'unknown';
    }

    // Upsert contact
    const contactName = contactProfile.name || msg.profile?.name || from;
    const contactResult = await query(
      `INSERT INTO contacts (org_id, name, phone)
       VALUES ($1, $2, $3)
       ON CONFLICT (org_id, phone) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [orgId, contactName, from]
    );
    const contactId = contactResult.rows[0].id;

    // Save extracted address from nfm_reply if present
    if (msg._extractedAddress) {
      try {
        const addr = msg._extractedAddress;
        await query(
          `INSERT INTO addresses (org_id, contact_id, street, city, state, zip, country, country_code, type, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'whatsapp')
           ON CONFLICT (org_id, contact_id, type) DO UPDATE SET
             street = EXCLUDED.street,
             city = EXCLUDED.city,
             state = EXCLUDED.state,
             zip = EXCLUDED.zip,
             country = EXCLUDED.country,
             country_code = EXCLUDED.country_code,
             source = EXCLUDED.source`,
          [orgId, contactId, addr.street, addr.city, addr.state, addr.zip, addr.country, addr.country_code, addr.type]
        );
        logger.info('Address saved from nfm_reply', { contactId, orgId });
      } catch (addrErr) {
        logger.error('Failed to save address from nfm_reply', { error: addrErr.message, contactId });
      }
    }

    // Find or create conversation
    let convResult = await query(
      `SELECT id, waba_account_id FROM conversations
       WHERE org_id = $1 AND contact_id = $2 AND status != 'closed'
       ORDER BY created_at DESC LIMIT 1`,
      [orgId, contactId]
    );

    let conversationId;
    if (convResult.rows.length === 0) {
      const newConv = await query(
        `INSERT INTO conversations (org_id, contact_id, status, last_message_at, waba_account_id)
         VALUES ($1, $2, 'open', $3, $4)
         RETURNING id`,
        [orgId, contactId, timestamp, wabaAccountId || null]
      );
      conversationId = newConv.rows[0].id;
    } else {
      conversationId = convResult.rows[0].id;
      await query(
        `UPDATE conversations
         SET last_message_at = $1,
             waba_account_id = COALESCE(waba_account_id, $2)
         WHERE id = $3`,
        [timestamp, wabaAccountId || null, conversationId]
      );
    }

    // For reactions, look up the target message by its WhatsApp external_id
    let reactionToMessageId = null;
    if (msg.reaction && msg.reaction.message_id) {
      const targetResult = await query(
        'SELECT id FROM messages WHERE external_id = $1 AND conversation_id = $2',
        [msg.reaction.message_id, conversationId]
      );
      if (targetResult.rows.length > 0) {
        reactionToMessageId = targetResult.rows[0].id;
      }
    }

    // Save message
    const msgResult = await query(
      `INSERT INTO messages (conversation_id, sender_type, content, media_url, media_mime_type, message_type, status, external_id, voice, reaction_to_message_id, created_at)
       VALUES ($1, 'contact', $2, $3, $4, $5, 'delivered', $6, $7, $8, $9)
       RETURNING id, conversation_id, sender_type, content, media_url, media_mime_type, message_type, status, external_id, voice, reaction_to_message_id, created_at`,
      [conversationId, content, mediaUrl, mediaMimeType, messageType, externalId, voice, reactionToMessageId, timestamp]
    );
    const message = msgResult.rows[0];

    // Emit Socket.IO events
    emitToConversation(orgId, conversationId, 'new_message', camelize(message));
    emitToOrg(orgId, 'conversation_updated', camelize({ conversation_id: conversationId, last_message_at: timestamp }));

    // TODO: Trigger automations (visual workflow engine)
    // await triggerWorkflows(orgId, 'message_received', { message, conversation_id: conversationId, contact_id: contactId });
  } catch (err) {
    logger.error('Failed to process incoming message', {
      orgId,
      externalId,
      from,
      error: err.message,
    });
  }
}

async function handleStatusUpdate(status, orgId) {
  const externalId = status.id;
  let messageStatus = 'sent';

  switch (status.status) {
    case 'sent':
      messageStatus = 'sent';
      break;
    case 'delivered':
      messageStatus = 'delivered';
      break;
    case 'read':
    case 'opened':
      messageStatus = 'read';
      break;
    case 'failed':
      messageStatus = 'failed';
      logger.warn('Message delivery failed', {
        externalId,
        error: status.errors || status.conversation?.errors,
      });
      break;
    default:
      messageStatus = status.status || 'sent';
  }

  try {
    const msgResult = await query(
      'UPDATE messages SET status = $1 WHERE external_id = $2 RETURNING id, conversation_id, status',
      [messageStatus, externalId]
    );

    if (msgResult.rows.length > 0) {
      const updatedMsg = msgResult.rows[0];
      // Emit real-time status update to conversation and org
      emitToConversation(orgId, updatedMsg.conversation_id, 'message_status_updated', camelize({
        message_id: updatedMsg.id,
        status: updatedMsg.status,
      }));
    }
  } catch (err) {
    logger.error('Failed to update message status', { externalId, status: messageStatus, error: err.message });
  }

  // Update campaign recipient status if applicable
  try {
    const campaignResult = await query(
      'SELECT id, campaign_id, status FROM campaign_recipients WHERE external_id = $1',
      [externalId]
    );
    if (campaignResult.rows.length > 0) {
      const recipient = campaignResult.rows[0];
      const newStatus = messageStatus;
      // Only update if moving forward in lifecycle (pending -> sent -> delivered -> read)
      const statusOrder = ['pending', 'queued', 'sent', 'delivered', 'read', 'failed'];
      const currentIndex = statusOrder.indexOf(recipient.status);
      const newIndex = statusOrder.indexOf(newStatus);
      if (newIndex > currentIndex || newStatus === 'failed') {
        await query(
          'UPDATE campaign_recipients SET status = $1 WHERE id = $2',
          [newStatus, recipient.id]
        );
        // Update campaign counters for delivered/read/failed
        const counterColumn =
          newStatus === 'delivered' ? 'delivered_count' :
          newStatus === 'read' ? 'read_count' :
          newStatus === 'failed' ? 'failed_count' : null;
        if (counterColumn) {
          await query(
            `UPDATE campaigns SET ${counterColumn} = ${counterColumn} + 1 WHERE id = $1`,
            [recipient.campaign_id]
          );
        }
      }
    }
  } catch (err) {
    logger.error('Failed to update campaign recipient status', { externalId, error: err.message });
  }
}

// TODO: Replace triggerWorkflows with automation engine execution
// async function triggerWorkflows(orgId, triggerType, context) {
//   try {
//     const wfResult = await query(
//       `SELECT id, conditions, actions FROM workflows
//        WHERE org_id = $1 AND trigger_type = $2 AND is_active = true`,
//       [orgId, triggerType]
//     );
//
//     for (const wf of wfResult.rows) {
//       const conditions = wf.conditions || {};
//       const actions = wf.actions || [];
//
//       // Simple condition check (keyword contains)
//       let matches = true;
//       if (conditions.keyword && context.message?.content) {
//         matches = context.message.content.toLowerCase().includes(conditions.keyword.toLowerCase());
//       }
//
//       if (!matches) continue;
//
//       for (const action of actions) {
//         if (action.type === 'send_message' && action.content) {
//           const convResult = await query(
//             'SELECT id FROM conversations WHERE id = $1',
//             [context.conversation_id]
//           );
//           if (convResult.rows.length > 0) {
//             await query(
//               `INSERT INTO messages (conversation_id, sender_type, content, message_type, status)
//                VALUES ($1, 'system', $2, 'text', 'sent')`,
//               [context.conversation_id, action.content]
//             );
//             emitToConversation(orgId, context.conversation_id, 'new_message', camelize({
//               conversation_id: context.conversation_id,
//               sender_type: 'system',
//               content: action.content,
//             }));
//           }
//         } else if (action.type === 'assign_agent' && action.agent_id) {
//           await query(
//             'UPDATE conversations SET assigned_agent_id = $1 WHERE id = $2',
//             [action.agent_id, context.conversation_id]
//           );
//           emitToOrg(orgId, 'conversation_updated', camelize({
//             conversation_id: context.conversation_id,
//             assigned_agent_id: action.agent_id,
//           }));
//         } else if (action.type === 'close_conversation') {
//           await query(
//             "UPDATE conversations SET status = 'closed' WHERE id = $1",
//             [context.conversation_id]
//           );
//           emitToOrg(orgId, 'conversation_updated', camelize({
//             conversation_id: context.conversation_id,
//             status: 'closed',
//           }));
//         }
//       }
//     }
//   } catch (err) {
//     logger.error('Workflow trigger error', err);
//   }
// }

/**
 * Legacy endpoints (kept for backward compatibility during migration)
 * These will be removed in a future version.
 */
router.get('/verify', (req, res) => {
  logger.warn('Using deprecated /verify endpoint. Configure Meta callback to /api/v1/webhooks instead.');
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsappVerifyToken) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/incoming', async (req, res) => {
  logger.warn('Using deprecated /incoming endpoint. Configure Meta callback to /api/v1/webhooks instead.');
  res.sendStatus(200);

  try {
    const body = req.body;
    if (!body.entry || !Array.isArray(body.entry)) return;

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value || !value.messages) continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const wabaResult = await query(
          'SELECT id, org_id, access_token FROM waba_accounts WHERE phone_number_id = $1 AND is_active = true',
          [phoneNumberId]
        );
        if (wabaResult.rows.length === 0) continue;

        const wabaAccount = wabaResult.rows[0];
        const orgId = wabaAccount.org_id;
        const accessToken = wabaAccount.access_token;
        const wabaAccountId = wabaAccount.id;

        for (const msg of value.messages) {
          await handleIncomingMessage(orgId, msg, phoneNumberId, accessToken, {}, wabaAccountId);
        }
        for (const status of value.statuses || []) {
          await handleStatusUpdate(status, orgId);
        }
      }
    }
  } catch (err) {
    logger.error('Webhook processing error', err);
  }
});

module.exports = router;
