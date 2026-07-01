require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

function requireEnv(name, value, minLength = 1) {
  if (!value || value.length < minLength) {
    throw new Error(`${name} is required and must be at least ${minLength} characters long`);
  }
  return value;
}

const jwtSecret = requireEnv('JWT_SECRET', process.env.JWT_SECRET, 32);
const jwtRefreshSecret = requireEnv('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET, 32);
const encryptionKey = requireEnv('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY, 32);

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret,
  jwtRefreshSecret,
  jwtAccessExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
  whatsappAppId: process.env.WHATSAPP_APP_ID,
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET,
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  cookieSecure: isProd,
  cookieSameSite: 'lax',
  corsOrigin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['http://localhost:3000', 'http://localhost:8080'],
  trustProxy: isProd,
  publicUrl: process.env.PUBLIC_URL || process.env.WEBHOOK_BASE_URL || null,
  googleChatWebhookUrl: process.env.GOOGLE_CHAT_WEBHOOK_URL || null,
  googleChatNotificationsEnabled: process.env.GOOGLE_CHAT_NOTIFICATIONS_ENABLED === 'true',
  encryptionKey,
};
