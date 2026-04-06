const express = require('express');
const crypto = require('crypto');
const wechatService = require('../services/wechat');
const tokenService = require('../services/token');
const db = require('../services/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async function login(req, res) {
  try {
    const { code, authType = 'wechat_h5' } = req.body;

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
    await db.query(
      `
        INSERT INTO users (openid, unionid, created_at, last_login_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (openid)
        DO UPDATE SET
          unionid = COALESCE(EXCLUDED.unionid, users.unionid),
          last_login_at = NOW()
      `,
      [authData.openid, authData.unionid || null]
    );

    const token = tokenService.issueToken({
      sub: authData.openid,
      openid: authData.openid,
      jti: crypto.randomUUID()
    });

    return res.json({
      success: true,
      data: {
        token,
        openid: authData.openid,
        unionid: authData.unionid || null
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
    const result = await db.query('SELECT openid, unionid, created_at, last_login_at FROM users WHERE openid = $1', [req.auth.openid]);
    if (!result.rows.length) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
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
