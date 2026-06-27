const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const migrate = require('./db/migrate');
const seed = require('./db/seed');
const { connectWithRetry } = require('./db');
const logger = require('./utils/logger');
const { initSocket } = require('./services/socket');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const organizationRoutes = require('./routes/organizations');
const agentRoutes = require('./routes/agents');
const contactRoutes = require('./routes/contacts');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const quickReplyRoutes = require('./routes/quickReplies');
// const workflowRoutes = require('./routes/workflows');
const automationRoutes = require('./routes/automations');
const analyticsRoutes = require('./routes/analytics');
const webhookRoutes = require('./routes/webhooks');
const uploadRoutes = require('./routes/upload');
const mediaRoutes = require('./routes/media');
const wabaAccountRoutes = require('./routes/wabaAccounts');
const templateRoutes = require('./routes/templates');
const { router: campaignRoutes } = require('./routes/campaigns');
const roleRoutes = require('./routes/roles');

// Workers
require('./queues/workers');

const app = express();
const server = http.createServer(app);

// Trust proxy in production
if (config.trustProxy) {
  app.set('trust proxy', 1);
}

// Helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...(config.corsOrigin || [])],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-waba-account-id'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  },
});
app.use('/api/', generalLimiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many auth attempts, please try again later.' });
  },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Static uploads
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// Health check with DB + Redis
app.get('/health', async (req, res) => {
  try {
    await connectWithRetry();
    const dbCheck = await require('./db').query('SELECT 1');
    if (!dbCheck) throw new Error('DB check failed');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Health check failed', err);
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/quick-replies', quickReplyRoutes);
app.use('/api/v1/automations', automationRoutes);
// app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/waba-accounts', wabaAccountRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/roles', roleRoutes);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
function gracefulShutdown(signal) {
  return () => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      require('./db').pool.end(() => {
        logger.info('Database pool closed');
        process.exit(0);
      });
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
}

process.on('SIGTERM', gracefulShutdown('SIGTERM'));
process.on('SIGINT', gracefulShutdown('SIGINT'));

// Initialize Socket.IO
initSocket(server, {
  origin: config.corsOrigin,
  credentials: true,
});

// Start server
async function start() {
  try {
    await connectWithRetry();
    await migrate();
    await seed();
    server.listen(config.port, '0.0.0.0', () => {
      logger.info(`BizlInbox server running on port ${config.port}`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
