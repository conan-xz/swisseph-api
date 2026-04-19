const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const wechatService = require('../services/wechat');
const tokenService = require('../services/token');
const ossService = require('../services/oss');
const db = require('../services/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});

function sanitizeNickName(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const segments = Array.from(trimmed);
  const limited = segments.length > 12 ? segments.slice(0, 12).join('') + '…' : trimmed;
  return limited;
}

function signAvatar(objectKey) {
  try {
    return ossService.signAvatarUrl(objectKey);
  } catch (error) {
    console.warn('signAvatarUrl failed:', error.message);
    return null;
  }
}

router.post('/login', async function login(req, res) {
  try {
    const { code, authType = 'wechat_h5', nickName } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'code is required',
        code: 'INVALID_PARAM'
      });
    }

    const authData = authType === 'mini_program'
      ? await wechatService.codeToSession(code)
      : await wechatService.h5CodeToSession(code);
    await db.initializeDatabase();
    const cleanNickName = sanitizeNickName(nickName);
    const upsertResult = await db.query(
      `
        INSERT INTO users (openid, unionid, nick_name, created_at, last_login_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (openid)
        DO UPDATE SET
          unionid = COALESCE(EXCLUDED.unionid, users.unionid),
          nick_name = COALESCE(EXCLUDED.nick_name, users.nick_name),
          last_login_at = NOW()
        RETURNING nick_name, avatar_object_key
      `,
      [authData.openid, authData.unionid || null, cleanNickName]
    );

    const token = tokenService.issueToken({
      sub: authData.openid,
      openid: authData.openid,
      jti: crypto.randomUUID()
    });

    const row = upsertResult.rows[0] || {};
    return res.json({
      success: true,
      data: {
        token,
        openid: authData.openid,
        unionid: authData.unionid || null,
        nickName: row.nick_name || null,
        avatarUrl: signAvatar(row.avatar_object_key)
      }
    });
  } catch (error) {
    console.error('Auth login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

router.post('/mini-profile', avatarUpload.single('avatar'), async function miniProfile(req, res) {
  try {
    const { code, nickName } = req.body || {};
    if (!code) {
      return res.status(400).json({
        error: 'code is required',
        code: 'INVALID_PARAM'
      });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        error: 'avatar file is required',
        code: 'AVATAR_REQUIRED'
      });
    }

    const authData = await wechatService.codeToSession(code);
    await db.initializeDatabase();

    const objectKey = await ossService.uploadAvatar(authData.openid, req.file.buffer, {
      mimetype: req.file.mimetype,
      originalname: req.file.originalname
    });

    const cleanNickName = sanitizeNickName(nickName);
    await db.query(
      `
        INSERT INTO users (openid, unionid, nick_name, avatar_object_key, created_at, last_login_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (openid)
        DO UPDATE SET
          unionid = COALESCE(EXCLUDED.unionid, users.unionid),
          nick_name = COALESCE(EXCLUDED.nick_name, users.nick_name),
          avatar_object_key = EXCLUDED.avatar_object_key,
          last_login_at = NOW()
      `,
      [authData.openid, authData.unionid || null, cleanNickName, objectKey]
    );

    return res.json({
      success: true,
      data: {
        openid: authData.openid,
        avatarObjectKey: objectKey,
        avatarUrl: signAvatar(objectKey)
      }
    });
  } catch (error) {
    console.error('Mini profile error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

router.get('/wechat-oauth-url', function getWechatOAuthUrl(req, res) {
  try {
    const redirect = req.query.redirect || '/pages/index/index';
    const scope = req.query.scope || 'snsapi_base';
    const state = req.query.state || 'astrology';
    const redirectUri = `${req.protocol}://${req.get('host')}/?auth_redirect=${encodeURIComponent(redirect)}`;
    const url = wechatService.buildH5OAuthUrl(redirectUri, state, scope);

    return res.json({
      success: true,
      data: {
        url
      }
    });
  } catch (error) {
    console.error('Get WeChat OAuth URL error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

router.post('/test-login', async function testLogin(req, res) {
  try {
    await db.initializeDatabase();
    const openid = 'test_user';
    const unionid = 'test_user';

    await db.query(
      `
        INSERT INTO users (openid, unionid, created_at, last_login_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (openid)
        DO UPDATE SET
          unionid = COALESCE(EXCLUDED.unionid, users.unionid),
          last_login_at = NOW()
      `,
      [openid, unionid]
    );

    const token = tokenService.issueToken({
      sub: openid,
      openid,
      jti: crypto.randomUUID()
    });

    return res.json({
      success: true,
      data: {
        token,
        openid,
        unionid,
        isTestAccount: true
      }
    });
  } catch (error) {
    console.error('Test login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

router.get('/me', authRequired, async function me(req, res) {
  try {
    await db.initializeDatabase();
    const result = await db.query(
      'SELECT openid, unionid, nick_name, avatar_object_key, created_at, last_login_at FROM users WHERE openid = $1',
      [req.auth.openid]
    );
    if (!result.rows.length) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      data: {
        openid: row.openid,
        unionid: row.unionid,
        nickName: row.nick_name,
        avatarUrl: signAvatar(row.avatar_object_key),
        created_at: row.created_at,
        last_login_at: row.last_login_at
      }
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
