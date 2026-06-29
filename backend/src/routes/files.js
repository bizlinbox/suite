const express = require('express');
const fs = require('fs');
const path = require('path');
const { query } = require('../db');
const { authenticate, requirePermission } = require('../middleware/auth');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

function scanFiles(dir, baseDir, files = [], orgId = null) {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (entry.name === 'temp') continue;

      // For whatsapp_media, only scan the org-specific subdirectory
      if (relativePath.startsWith('whatsapp_media')) {
        const parts = relativePath.split('/');
        if (parts.length >= 2) {
          const dirOrgId = parts[1];
          if (String(orgId) !== String(dirOrgId)) continue;
        }
      }

      scanFiles(fullPath, baseDir, files, orgId);
    } else {
      const stat = fs.statSync(fullPath);
      files.push({
        path: relativePath,
        name: entry.name,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
      });
    }
  }
  return files;
}

function inferMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.3gp': 'video/3gpp',
    '.aac': 'audio/aac',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.amr': 'audio/amr',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return map[ext] || 'application/octet-stream';
}

function normalizeMediaUrl(mediaUrl) {
  if (!mediaUrl) return null;
  let normalized = mediaUrl;
  // Strip public URL prefix if present
  if (config.publicUrl && normalized.startsWith(config.publicUrl)) {
    normalized = normalized.slice(config.publicUrl.length);
  }
  // Strip leading /uploads/ or uploads/
  if (normalized.startsWith('/uploads/')) {
    normalized = normalized.slice('/uploads/'.length);
  } else if (normalized.startsWith('uploads/')) {
    normalized = normalized.slice('uploads/'.length);
  }
  // Strip leading slash
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }
  return normalized;
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const search = (req.query.q || '').toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;

    const uploadDir = path.resolve(config.uploadDir);
    let diskFiles = scanFiles(uploadDir, uploadDir, [], req.user.org_id);

    // Query messages for local media references to enrich metadata
    const msgResult = await query(
      `SELECT m.media_url, m.media_mime_type, m.filename, m.created_at
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE c.org_id = $1 AND m.media_url IS NOT NULL`,
      [req.user.org_id]
    );

    const messageMediaMap = new Map();
    for (const row of msgResult.rows) {
      const normalized = normalizeMediaUrl(row.media_url);
      if (!normalized) continue;
      messageMediaMap.set(normalized, {
        mimeType: row.media_mime_type,
        filename: row.filename,
        createdAt: row.created_at,
      });
    }

    const enrichedFiles = diskFiles.map((file) => {
      const msgInfo = messageMediaMap.get(file.path);
      const isWhatsappMedia = file.path.startsWith('whatsapp_media/');
      const source = isWhatsappMedia ? 'message' : 'upload';
      return {
        id: Buffer.from(file.path).toString('base64'),
        name: msgInfo?.filename || file.name,
        path: file.path,
        size: file.size,
        mimeType: msgInfo?.mimeType || inferMimeType(file.name),
        source,
        createdAt: msgInfo?.createdAt || file.createdAt,
        url: `/uploads/${file.path}`,
      };
    });

    // Filter by search
    let filtered = enrichedFiles;
    if (search) {
      filtered = enrichedFiles.filter((f) => f.name.toLowerCase().includes(search));
    }

    const totalSize = filtered.reduce((sum, f) => sum + f.size, 0);
    const totalCount = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    res.json({
      files: paginated,
      totalCount,
      totalSize,
    });
  } catch (err) {
    logger.error('List files error', err);
    next(err);
  }
});

router.delete('/:id', authenticate, requirePermission('settings.manage'), async (req, res, next) => {
  try {
    let filePath;
    try {
      filePath = Buffer.from(req.params.id, 'base64').toString('utf-8');
    } catch {
      return res.status(400).json({ error: 'Invalid file id' });
    }

    const uploadDir = path.resolve(config.uploadDir);
    const absolutePath = path.join(uploadDir, filePath);

    // Security: ensure resolved path is within uploadDir
    const resolvedPath = path.resolve(absolutePath);
    if (!resolvedPath.startsWith(uploadDir)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(resolvedPath);

    // Clean up empty parent directories up to uploadDir
    let dir = path.dirname(resolvedPath);
    while (dir !== uploadDir) {
      try {
        fs.rmdirSync(dir);
        dir = path.dirname(dir);
      } catch {
        break;
      }
    }

    res.json({ success: true });
  } catch (err) {
    logger.error('Delete file error', err);
    next(err);
  }
});

module.exports = router;
