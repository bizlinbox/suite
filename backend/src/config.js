require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh',
  jwtAccessExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
  whatsappAppId: process.env.WHATSAPP_APP_ID,
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET,
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  cookieSecure: isProd,
  cookieSameSite: 'lax',
  corsOrigin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['http://localhost:3000'],
  trustProxy: isProd,
  publicUrl: process.env.PUBLIC_URL || process.env.WEBHOOK_BASE_URL || null,
  googleChatWebhookUrl: process.env.GOOGLE_CHAT_WEBHOOK_URL || null,
  googleChatNotificationsEnabled: process.env.GOOGLE_CHAT_NOTIFICATIONS_ENABLED === 'true',
};
