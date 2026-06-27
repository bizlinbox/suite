const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const WHATSAPP_BASE_URL = `https://graph.facebook.com/${config.whatsappApiVersion}`;

/**
 * Create a new Flow on Meta's WhatsApp servers
 */
async function createFlow(phoneNumberId, accessToken, name, category = 'OTHER', flowJson = {}) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/flows`;
  const payload = {
    name,
    categories: [category],
    ...(Object.keys(flowJson).length > 0 && { flow_json: flowJson }),
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

/**
 * Update an existing Flow's JSON definition
 */
async function updateFlow(flowId, accessToken, flowJson) {
  const url = `${WHATSAPP_BASE_URL}/${flowId}`;
  const payload = { flow_json: flowJson };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

/**
 * Get a single Flow's details
 */
async function getFlow(flowId, accessToken) {
  const url = `${WHATSAPP_BASE_URL}/${flowId}`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

/**
 * List flows for a business account
 */
async function listFlows(businessAccountId, accessToken) {
  const url = `${WHATSAPP_BASE_URL}/${businessAccountId}/flows?limit=1000`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data.data || [];
}

/**
 * Publish a flow (make it active)
 */
async function publishFlow(flowId, accessToken) {
  const url = `${WHATSAPP_BASE_URL}/${flowId}/publish`;
  const response = await axios.post(url, {}, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

/**
 * Delete a flow
 */
async function deleteFlow(flowId, accessToken) {
  const url = `${WHATSAPP_BASE_URL}/${flowId}`;
  const response = await axios.delete(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

/**
 * Send a Flow message to a contact
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/sendingaflow
 */
async function sendFlowMessage(phoneNumberId, accessToken, to, options = {}) {
  const url = `${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`;

  const parameters = {
    flow_message_version: options.flowMessageVersion || '3',
    flow_token: options.flowToken || `token-${Date.now()}`,
    flow_id: options.flowId,
    flow_cta: options.cta || 'Open',
  };

  // Optional: navigate to a specific screen with pre-filled data
  if (options.screen) {
    parameters.flow_action = 'navigate';
    parameters.flow_action_payload = {
      screen: options.screen,
      ...(options.data && Object.keys(options.data).length > 0 && { data: options.data }),
    };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: options.header ? { type: 'text', text: options.header } : undefined,
      body: { text: options.body || 'Please complete the form' },
      footer: options.footer ? { text: options.footer } : undefined,
      action: {
        name: 'flow',
        parameters,
      },
    },
  };

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

module.exports = {
  createFlow,
  updateFlow,
  getFlow,
  listFlows,
  publishFlow,
  deleteFlow,
  sendFlowMessage,
};
