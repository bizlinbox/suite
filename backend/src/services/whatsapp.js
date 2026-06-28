const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { query } = require('../db');
const { logApiCall } = require('./apiLog');

const WHATSAPP_BASE_URL = `https://graph.facebook.com/${config.whatsappApiVersion}`;

/**
 * Upload media to Meta's WhatsApp servers.
 * Returns the media ID which is more reliable than public links.
 */
async function uploadMedia(phoneNumberId, accessToken, filePath, mimeType) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/media`;
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: mimeType || 'application/octet-stream',
  });

  const response = await axios.post(url, form, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...form.getHeaders(),
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return response.data.id; // media ID
}

/**
 * Get media metadata from Meta's WhatsApp servers.
 * Returns the temporary download URL and mime type.
 */
async function getMedia(mediaId, accessToken) {
  const url = `${WHATSAPP_BASE_URL}/${mediaId}`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

/**
 * Delete media from Meta's WhatsApp servers.
 */
async function deleteMedia(mediaId, accessToken) {
  const url = `${WHATSAPP_BASE_URL}/${mediaId}`;
  const response = await axios.delete(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

async function sendTextMessage(phoneNumberId, accessToken, to, content, previewUrl = false) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const textObj = { body: content };
  if (previewUrl) {
    textObj.preview_url = true;
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: textObj,
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendMediaMessage(phoneNumberId, accessToken, to, mediaUrl, caption, messageType, filename, mediaMimeType) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const type = messageType === 'document' ? 'document' : messageType;

  let metaMediaId = null;

  // If mediaUrl is a local file path (not a Meta media ID or public link),
  // upload it to Meta first to get a reliable media ID.
  if (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
    // Meta media IDs are numeric strings — use directly without re-uploading
    if (/^\d+$/.test(mediaUrl)) {
      metaMediaId = mediaUrl;
    } else {
      // Resolve local path against the configured upload directory
      const uploadsBase = path.resolve(config.uploadDir);
      let fullPath = path.isAbsolute(mediaUrl) ? mediaUrl : path.join(uploadsBase, mediaUrl);

      // Fallback: try legacy process.cwd() path if not found in uploadDir
      if (!fs.existsSync(fullPath)) {
        fullPath = path.join(process.cwd(), mediaUrl);
      }

      // Fallback: bare filename might be stored at upload root
      if (!fs.existsSync(fullPath)) {
        fullPath = path.join(uploadsBase, path.basename(mediaUrl));
      }

      if (fs.existsSync(fullPath)) {
        const mime = mediaMimeType || 'application/octet-stream';
        metaMediaId = await uploadMedia(phoneNumberId, accessToken, fullPath, mime);
      } else {
        throw new Error(`Media file not found: ${fullPath}`);
      }
    }
  } else {
    // It's a public URL — try uploading to Meta for reliability
    // Download the file locally first, then upload to Meta
    try {
      const response = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const tempFile = path.join(require('os').tmpdir(), `wa_media_${Date.now()}_${path.basename(mediaUrl.split('?')[0])}`);
      fs.writeFileSync(tempFile, Buffer.from(response.data));
      const mime = mediaMimeType || response.headers['content-type'] || 'application/octet-stream';
      metaMediaId = await uploadMedia(phoneNumberId, accessToken, tempFile, mime);
      try { fs.unlinkSync(tempFile); } catch {}
    } catch (dlErr) {
      logger.warn('Failed to download/upload media to Meta, falling back to link', { mediaUrl, error: dlErr.message });
      // Fallback: use the URL as a link (requires Meta to reach it)
      metaMediaId = null;
    }
  }

  const mediaObj = {};

  if (metaMediaId) {
    mediaObj.id = metaMediaId;
  } else {
    mediaObj.link = mediaUrl;
  }

  // Only certain types support caption per Meta's API
  if (caption && ['image', 'video', 'document'].includes(type)) {
    mediaObj.caption = caption;
  }

  // Document supports an explicit filename (what WhatsApp displays as the file title)
  if (type === 'document' && filename) {
    mediaObj.filename = filename;
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type,
    [type]: mediaObj,
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendAddressMessage(phoneNumberId, accessToken, to, options = {}) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'address_message',
      header: options.header ? { text: options.header } : undefined,
      body: { text: options.body || 'Please share your delivery address' },
      footer: options.footer ? { text: options.footer } : undefined,
      action: {
        name: 'address_message',
        parameters: {
          country: options.country || 'US',
          ...(options.saved_addresses && { saved_addresses: options.saved_addresses }),
        },
      },
    },
  };

  // Remove undefined fields
  if (!payload.interactive.header) delete payload.interactive.header;
  if (!payload.interactive.footer) delete payload.interactive.footer;

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendLocationRequestMessage(phoneNumberId, accessToken, to, options = {}) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'location_request_message',
      body: { text: options.body || 'Please share your location.' },
      action: { name: 'send_location' },
    },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendCtaUrlMessage(phoneNumberId, accessToken, to, options = {}) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const interactive = {
    type: 'cta_url',
    body: { text: options.body || 'Tap the button below.' },
    action: {
      name: 'cta_url',
      parameters: {
        display_text: options.display_text || 'Open Link',
        url: options.url,
      },
    },
  };

  // Header: optional, supports text | image | video | document
  if (options.header) {
    const headerType = options.header.type || 'text';
    interactive.header = { type: headerType };
    if (headerType === 'text') {
      interactive.header.text = options.header.text || '';
    } else if (['image', 'video', 'document'].includes(headerType)) {
      const media = {};
      if (options.header[headerType]?.link) media.link = options.header[headerType].link;
      else if (options.header[headerType]?.id) media.id = options.header[headerType].id;
      interactive.header[headerType] = media;
    }
  }

  // Footer: optional
  if (options.footer) {
    interactive.footer = { text: options.footer };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive,
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendProductListMessage(phoneNumberId, accessToken, to, options = {}) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const interactive = {
    type: 'product_list',
    header: {
      type: 'text',
      text: options.header || 'Our Products',
    },
    body: { text: options.body || 'Browse our products below.' },
    action: {
      catalog_id: options.catalog_id,
      sections: Array.isArray(options.sections) ? options.sections : [],
    },
  };

  // Footer: optional
  if (options.footer) {
    interactive.footer = { text: options.footer };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive,
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendReplyButtonsMessage(phoneNumberId, accessToken, to, options = {}) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const buttons = (options.buttons || []).slice(0, 3).map((btn) => ({
    type: 'reply',
    reply: {
      id: btn.id,
      title: btn.title,
    },
  }));

  const interactive = {
    type: 'button',
    body: { text: options.body || 'Please choose an option:' },
    action: { buttons },
  };

  // Header: optional, supports text | image | video | document
  if (options.header) {
    const headerType = options.header.type || 'text';
    interactive.header = { type: headerType };
    if (headerType === 'text') {
      interactive.header.text = options.header.text || '';
    } else if (['image', 'video', 'document'].includes(headerType)) {
      const media = {};
      if (options.header[headerType]?.link) media.link = options.header[headerType].link;
      else if (options.header[headerType]?.id) media.id = options.header[headerType].id;
      interactive.header[headerType] = media;
    }
  }

  // Footer: optional
  if (options.footer) {
    interactive.footer = { text: options.footer };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive,
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendLocationMessage(phoneNumberId, accessToken, to, options = {}) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'location',
    location: {
      latitude: options.latitude,
      longitude: options.longitude,
      ...(options.name && { name: options.name }),
      ...(options.address && { address: options.address }),
    },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendListMessage(phoneNumberId, accessToken, to, options = {}) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const interactive = {
    type: 'list',
    body: { text: options.body || 'Please select an option:' },
    action: {
      button: options.button || 'Options',
      sections: Array.isArray(options.sections) ? options.sections : [],
    },
  };

  // Header: optional, text-only for list messages
  if (options.header) {
    interactive.header = { type: 'text', text: options.header };
  }

  // Footer: optional
  if (options.footer) {
    interactive.footer = { text: options.footer };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive,
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendContactsMessage(phoneNumberId, accessToken, to, contacts) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'contacts',
    contacts: Array.isArray(contacts) ? contacts : [contacts],
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendReactionMessage(phoneNumberId, accessToken, to, options = {}) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'reaction',
    reaction: {
      message_id: options.message_id,
      emoji: options.emoji,
    },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendTemplateMessage(phoneNumberId, accessToken, to, templateName, languageCode, templateVariables) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;

  const template = {
    name: templateName,
    language: {
      code: languageCode || 'en',
    },
  };

  // Build components if variables are provided
  if (templateVariables && Array.isArray(templateVariables) && templateVariables.length > 0) {
    template.components = [
      {
        type: 'body',
        parameters: templateVariables.map((v) => ({
          type: 'text',
          text: String(v),
        })),
      },
    ];
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template,
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendMessage(jobData) {
  const {
    phoneNumberId,
    accessToken,
    to,
    content,
    mediaUrl,
    mediaMimeType,
    messageType,
    messageId,
    wabaAccountId,
    orgId,
    conversationId,
    addressOptions,
    contactsData,
    ctaUrlOptions,
    listOptions,
    productListOptions,
    replyButtonsOptions,
    locationOptions,
    locationRequestOptions,
    reactionOptions,
    filename,
    voice,
    templateName,
    templateLanguage,
    templateVariables,
  } = jobData;

  async function timedSend(fn, endpoint) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      await logApiCall({
        orgId,
        conversationId,
        direction: 'outgoing',
        provider: 'whatsapp',
        endpoint,
        method: 'POST',
        requestBody: { to, type: messageType || 'text', content: content || '' },
        responseBody: result,
        statusCode: 200,
        durationMs: duration,
        success: true,
      });
      return result;
    } catch (err) {
      const duration = Date.now() - start;
      const statusCode = err.response?.status || 0;
      await logApiCall({
        orgId,
        conversationId,
        direction: 'outgoing',
        provider: 'whatsapp',
        endpoint,
        method: 'POST',
        requestBody: { to, type: messageType || 'text', content: content || '' },
        responseBody: err.response?.data || null,
        statusCode,
        durationMs: duration,
        success: false,
        errorMessage: err.response?.data?.error?.message || err.message,
      });
      throw err;
    }
  }

  const endpoint = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;

  try {
    let result;
    if (messageType === 'template' && templateName) {
      result = await timedSend(() => sendTemplateMessage(phoneNumberId, accessToken, to, templateName, templateLanguage, templateVariables), endpoint);
    } else if (messageType === 'address_message' && addressOptions) {
      result = await timedSend(() => sendAddressMessage(phoneNumberId, accessToken, to, addressOptions), endpoint);
    } else if (messageType === 'location_request_message' && locationRequestOptions) {
      result = await timedSend(() => sendLocationRequestMessage(phoneNumberId, accessToken, to, locationRequestOptions), endpoint);
    } else if (messageType === 'cta_url' && ctaUrlOptions) {
      result = await timedSend(() => sendCtaUrlMessage(phoneNumberId, accessToken, to, ctaUrlOptions), endpoint);
    } else if (messageType === 'list' && listOptions) {
      result = await timedSend(() => sendListMessage(phoneNumberId, accessToken, to, listOptions), endpoint);
    } else if (messageType === 'product_list' && productListOptions) {
      result = await timedSend(() => sendProductListMessage(phoneNumberId, accessToken, to, productListOptions), endpoint);
    } else if (messageType === 'button' && replyButtonsOptions) {
      result = await timedSend(() => sendReplyButtonsMessage(phoneNumberId, accessToken, to, replyButtonsOptions), endpoint);
    } else if (messageType === 'location' && locationOptions) {
      result = await timedSend(() => sendLocationMessage(phoneNumberId, accessToken, to, locationOptions), endpoint);
    } else if (messageType === 'reaction' && reactionOptions) {
      result = await timedSend(() => sendReactionMessage(phoneNumberId, accessToken, to, reactionOptions), endpoint);
    } else if (messageType === 'contacts' && contactsData) {
      result = await timedSend(() => sendContactsMessage(phoneNumberId, accessToken, to, contactsData), endpoint);
    } else if (messageType === 'text' || !mediaUrl) {
      result = await timedSend(() => sendTextMessage(phoneNumberId, accessToken, to, content, jobData.previewUrl), endpoint);
    } else {
      result = await timedSend(() => sendMediaMessage(phoneNumberId, accessToken, to, mediaUrl, content, messageType, filename, mediaMimeType), endpoint);
    }

    // Update message status and external_id if available
    const externalId = result.messages?.[0]?.id;
    if (externalId && messageId) {
      await query(
        'UPDATE messages SET external_id = $1, status = $2 WHERE id = $3',
        [externalId, 'sent', messageId]
      );
    }

    // Track campaign recipient send
    if (jobData.campaignRecipientId) {
      await query(
        "UPDATE campaign_recipients SET status = 'sent', external_id = $1, sent_at = NOW() WHERE id = $2",
        [externalId || null, jobData.campaignRecipientId]
      );
    }

    logger.info('WhatsApp message sent', { messageId, externalId, to, messageType: messageType || 'text', campaignRecipientId: jobData.campaignRecipientId || null });
    return result;
  } catch (err) {
    const errorDetail = err.response?.data?.error?.message || err.message || 'Unknown error';
    logger.error('WhatsApp send message error', {
      message: err.message,
      response: err.response?.data,
    });

    if (messageId) {
      await query(
        "UPDATE messages SET status = 'failed', error_message = $1 WHERE id = $2",
        [errorDetail.substring(0, 500), messageId]
      );
      // Emit socket event so frontend shows the failure immediately
      const { emitToConversation } = require('./socket');
      try {
        const msgResult = await query('SELECT conversation_id FROM messages WHERE id = $1', [messageId]);
        if (msgResult.rows.length > 0) {
          const convId = msgResult.rows[0].conversation_id;
          const convResult = await query('SELECT org_id FROM conversations WHERE id = $1', [convId]);
          if (convResult.rows.length > 0) {
            emitToConversation(convResult.rows[0].org_id, convId, 'message_status_updated', { messageId, status: 'failed', errorMessage: errorDetail });
          }
        }
      } catch (socketErr) {
        // Ignore socket errors
      }
    }

    // Track campaign recipient failure
    if (jobData.campaignRecipientId) {
      await query(
        "UPDATE campaign_recipients SET status = 'failed', error_message = $1 WHERE id = $2",
        [errorDetail.substring(0, 500), jobData.campaignRecipientId]
      );
      // Increment campaign failed_count
      if (jobData.campaignId) {
        await query(
          "UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = $1",
          [jobData.campaignId]
        );
      }
    }

    throw err;
  }
}

module.exports = {
  sendMessage,
  sendTextMessage,
  sendMediaMessage,
  sendTemplateMessage,
  sendAddressMessage,
  sendContactsMessage,
  sendCtaUrlMessage,
  sendListMessage,
  sendProductListMessage,
  sendReplyButtonsMessage,
  sendLocationMessage,
  sendLocationRequestMessage,
  sendReactionMessage,
  uploadMedia,
  getMedia,
  deleteMedia,
};
