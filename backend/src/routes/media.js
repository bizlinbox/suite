const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const { authenticate, resolveWabaAccount } = require('../middleware/auth');
const { uploadMedia, getMedia, deleteMedia } = require('../services/whatsapp');
const logger = require('../utils/logger');
const config = require('../config');

const router = express.Router();

const META_ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/3gpp',
  'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg', 'audio/webm',
  'text/plain',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(config.uploadDir, 'temp');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).substring(2, 11)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (META_ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed by Meta: ${file.mimetype}`), false);
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Meta max varies by type, 100MB is safe upper bound
  fileFilter,
});

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
}

// Helper to get org's active WABA account credentials
async function getOrgCredentials(orgId, wabaAccountId = null) {
  if (!wabaAccountId) {
    const result = await query(
      'SELECT phone_number_id, access_token FROM waba_accounts WHERE org_id = $1 AND is_active = true LIMIT 1',
      [orgId]
    );
    if (!result.rows[0]) return null;
    return result.rows[0];
  }

  const result = await query(
    'SELECT phone_number_id, access_token FROM waba_accounts WHERE id = $1 AND org_id = $2',
    [wabaAccountId, orgId]
  );
  if (!result.rows[0]) return null;
  return result.rows[0];
}

// POST /api/v1/media - Upload file to Meta's WhatsApp servers
router.post('/', authenticate, resolveWabaAccount, upload.single('file'), handleMulterError, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const credentials = await getOrgCredentials(req.user.org_id, req.wabaAccountId);
    if (!credentials) {
      // Clean up temp file
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'No WhatsApp number configured for this organization' });
    }

    const mediaId = await uploadMedia(
      credentials.phone_number_id,
      credentials.access_token,
      req.file.path,
      req.file.mimetype
    );

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    res.json({
      id: mediaId,
      phone_number_id: credentials.phone_number_id,
    });
  } catch (err) {
    // Clean up temp file on error
    if (req.file) fs.unlink(req.file.path, () => {});
    logger.error('Meta media upload failed', { error: err.message, response: err.response?.data });
    next(err);
  }
});

// GET /api/v1/media/:mediaId - Retrieve media metadata from Meta
router.get('/:mediaId', authenticate, resolveWabaAccount, async (req, res, next) => {
  try {
    const { mediaId } = req.params;
    const credentials = await getOrgCredentials(req.user.org_id, req.wabaAccountId);
    if (!credentials) {
      return res.status(404).json({ error: 'No WhatsApp number configured for this organization' });
    }

    const metaData = await getMedia(mediaId, credentials.access_token);
    res.json(metaData);
  } catch (err) {
    logger.error('Meta media retrieve failed', { error: err.message, response: err.response?.data });
    next(err);
  }
});

// DELETE /api/v1/media/:mediaId - Delete media from Meta's servers
router.delete('/:mediaId', authenticate, resolveWabaAccount, async (req, res, next) => {
  try {
    const { mediaId } = req.params;
    const credentials = await getOrgCredentials(req.user.org_id, req.wabaAccountId);
    if (!credentials) {
      return res.status(404).json({ error: 'No WhatsApp number configured for this organization' });
    }

    await deleteMedia(mediaId, credentials.access_token);
    res.json({ success: true, id: mediaId });
  } catch (err) {
    logger.error('Meta media delete failed', { error: err.message, response: err.response?.data });
    next(err);
  }
});

module.exports = router;
