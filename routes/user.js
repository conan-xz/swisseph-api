const express = require('express');
const multer = require('multer');
const db = require('../services/db');
const ossService = require('../services/oss');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});
const BANNED_NICKNAMES = new Set(['微信用户', '微信号', '新用户', '用户']);

function sanitizeNickName(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (BANNED_NICKNAMES.has(trimmed)) return null;
  const segments = Array.from(trimmed);
  return segments.length > 12 ? segments.slice(0, 12).join('') + '…' : trimmed;
}

function signAvatar(objectKey) {
  try {
    return ossService.signAvatarUrl(objectKey);
  } catch (error) {
    console.warn('signAvatarUrl failed:', error.message);
    return null;
  }
}

router.post('/profile', authRequired, async function updateProfile(req, res) {
  try {
    const cleanNickName = sanitizeNickName(req.body && req.body.nickName);
    if (!cleanNickName) {
      return res.status(400).json({
        error: 'nickName is required and must not be a default name',
        code: 'INVALID_NICKNAME'
      });
    }

    await db.initializeDatabase();
    const result = await db.query(
      `
        INSERT INTO users (openid, nick_name, created_at, last_login_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (openid)
        DO UPDATE SET
          nick_name = EXCLUDED.nick_name,
          last_login_at = NOW()
        RETURNING nick_name, avatar_object_key
      `,
      [req.auth.openid, cleanNickName]
    );

    const row = result.rows[0] || {};
    return res.json({
      success: true,
      data: {
        nickName: row.nick_name || null,
        avatarUrl: signAvatar(row.avatar_object_key)
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

router.post('/profile/avatar', authRequired, avatarUpload.single('avatar'), async function updateProfileAvatar(req, res) {
  try {
    const cleanNickName = sanitizeNickName(req.body && req.body.nickName);
    if (!cleanNickName) {
      return res.status(400).json({
        error: 'nickName is required and must not be a default name',
        code: 'INVALID_NICKNAME'
      });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        error: 'avatar file is required',
        code: 'AVATAR_REQUIRED'
      });
    }

    await db.initializeDatabase();
    const objectKey = await ossService.uploadAvatar(req.auth.openid, req.file.buffer, {
      mimetype: req.file.mimetype,
      originalname: req.file.originalname
    });
    const result = await db.query(
      `
        INSERT INTO users (openid, nick_name, avatar_object_key, created_at, last_login_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (openid)
        DO UPDATE SET
          nick_name = EXCLUDED.nick_name,
          avatar_object_key = EXCLUDED.avatar_object_key,
          last_login_at = NOW()
        RETURNING nick_name, avatar_object_key
      `,
      [req.auth.openid, cleanNickName, objectKey]
    );

    const row = result.rows[0] || {};
    return res.json({
      success: true,
      data: {
        openid: req.auth.openid,
        nickName: row.nick_name || null,
        avatarObjectKey: row.avatar_object_key || objectKey,
        avatarUrl: signAvatar(row.avatar_object_key || objectKey)
      }
    });
  } catch (error) {
    console.error('Update profile avatar error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
