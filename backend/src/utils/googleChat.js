const axios = require('axios');
const logger = require('./logger');
const config = require('../config');

function isEnabled() {
  return config.googleChatNotificationsEnabled;
}

async function sendNotification({ taskName, taskId, user, timestamp, status, details }) {
  if (!isEnabled()) return;
  if (!config.googleChatWebhookUrl) {
    logger.warn('Google Chat webhook URL not configured');
    return;
  }

  const ts = timestamp || new Date().toISOString();
  const text = `Task completed: ${taskName} (ID: ${taskId}) by ${user} at ${ts}. Status: ${status}${details ? `. Details: ${details}` : ''}`;

  try {
    await axios.post(
      config.googleChatWebhookUrl,
      { text },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    logger.info('Google Chat notification sent', { taskName, taskId });
  } catch (err) {
    logger.error('Google Chat notification failed', err.response?.data || err.message);
  }
}

module.exports = { sendNotification, isEnabled };
