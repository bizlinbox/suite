const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { query } = require('../db');

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

async function sendMediaMessage(phoneNumberId, accessToken, to, mediaUrl, caption, messageType, filename) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;
  const type = messageType === 'document' ? 'document' : messageType;

  const mediaObj = {};

  // Meta supports both 'id' (uploaded media) and 'link' (public URL)
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    mediaObj.link = mediaUrl;
  } else {
    // Treat as uploaded media ID
    mediaObj.id = mediaUrl;
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

async function sendMessage(jobData) {
  const {
    phoneNumberId,
    accessToken,
    to,
    content,
    mediaUrl,
    messageType,
    messageId,
    wabaAccountId,
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
  } = jobData;

  try {
    let result;
    if (messageType === 'address_message' && addressOptions) {
      result = await sendAddressMessage(phoneNumberId, accessToken, to, addressOptions);
    } else if (messageType === 'location_request_message' && locationRequestOptions) {
      result = await sendLocationRequestMessage(phoneNumberId, accessToken, to, locationRequestOptions);
    } else if (messageType === 'cta_url' && ctaUrlOptions) {
      result = await sendCtaUrlMessage(phoneNumberId, accessToken, to, ctaUrlOptions);
    } else if (messageType === 'list' && listOptions) {
      result = await sendListMessage(phoneNumberId, accessToken, to, listOptions);
    } else if (messageType === 'product_list' && productListOptions) {
      result = await sendProductListMessage(phoneNumberId, accessToken, to, productListOptions);
    } else if (messageType === 'button' && replyButtonsOptions) {
      result = await sendReplyButtonsMessage(phoneNumberId, accessToken, to, replyButtonsOptions);
    } else if (messageType === 'location' && locationOptions) {
      result = await sendLocationMessage(phoneNumberId, accessToken, to, locationOptions);
    } else if (messageType === 'reaction' && reactionOptions) {
      result = await sendReactionMessage(phoneNumberId, accessToken, to, reactionOptions);
    } else if (messageType === 'contacts' && contactsData) {
      result = await sendContactsMessage(phoneNumberId, accessToken, to, contactsData);
    } else if (messageType === 'text' || !mediaUrl) {
      result = await sendTextMessage(phoneNumberId, accessToken, to, content, jobData.previewUrl);
    } else {
      result = await sendMediaMessage(phoneNumberId, accessToken, to, mediaUrl, content, messageType, filename);
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
    logger.error('WhatsApp send message error', {
      message: err.message,
      response: err.response?.data,
    });

    if (messageId) {
      await query(
        "UPDATE messages SET status = 'failed' WHERE id = $1",
        [messageId]
      );
    }

    // Track campaign recipient failure
    if (jobData.campaignRecipientId) {
      await query(
        "UPDATE campaign_recipients SET status = 'failed', error_message = $1 WHERE id = $2",
        [err.message?.substring(0, 500) || 'Unknown error', jobData.campaignRecipientId]
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
