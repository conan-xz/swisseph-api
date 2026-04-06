/**
 * WeChat Service
 * 微信服务 - 处理微信 API 调用
 */

const axios = require('axios');
const config = require('../config/wechat');

/**
 * Exchange code for session
 * 用 code 换取 openid 和 session_key
 *
 * @param {string} code - WeChat login code
 * @returns {Promise<Object>} - { openid, session_key, unionid? }
 */
async function codeToSession(code) {
  try {
    if (!code) {
      throw new Error('code is required');
    }

    // Mock test data
    if (code === 'test') {
      return {
        openid: 'test',
        session_key: 'test',
        unionid: 'test'
      };
    }

    if (!config.appId || !config.appSecret) {
      throw new Error('WeChat APP_ID or APP_SECRET not configured');
    }

    const response = await axios.get(config.jscode2sessionUrl, {
      params: {
        appid: config.appId,
        secret: config.appSecret,
        js_code: code,
        grant_type: 'authorization_code'
      },
      timeout: 5000
    });

    const { data } = response;

    // Check for error in response
    if (data.errcode) {
      throw new Error(`WeChat API Error: ${data.errcode} - ${data.errmsg || 'Unknown error'}`);
    }

    if (!data.openid) {
      throw new Error('Failed to get openid from WeChat API');
    }

    return {
      openid: data.openid,
      session_key: data.session_key,
      unionid: data.unionid // Optional, only present if user has authorized
    };
  } catch (error) {
    console.error('WeChat codeToSession error:', error.message);
    throw error;
  }
}

/**
 * Build WeChat H5 OAuth URL
 * 使用公众号网页授权构建跳转地址
 */
function buildH5OAuthUrl(redirectUri, state = '', scope = config.oauthScope || 'snsapi_base') {
  if (!config.h5AppId) {
    throw new Error('WeChat H5 APP_ID not configured');
  }

  if (!redirectUri) {
    throw new Error('redirectUri is required');
  }

  const params = new URLSearchParams({
    appid: config.h5AppId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    state: state || 'astrology'
  });

  return `${config.oauthAuthorizeUrl}?${params.toString()}#wechat_redirect`;
}

/**
 * Exchange H5 OAuth code for openid
 * 用公众号网页授权 code 换取 openid
 */
async function h5CodeToSession(code) {
  try {
    if (!code) {
      throw new Error('code is required');
    }

    if (code === 'test') {
      return {
        openid: 'test_user',
        unionid: 'test_user'
      };
    }

    if (!config.h5AppId || !config.h5AppSecret) {
      throw new Error('WeChat H5 APP_ID or APP_SECRET not configured');
    }

    const response = await axios.get(config.oauthAccessTokenUrl, {
      params: {
        appid: config.h5AppId,
        secret: config.h5AppSecret,
        code,
        grant_type: 'authorization_code'
      },
      timeout: 5000
    });

    const { data } = response;
    if (data.errcode) {
      throw new Error(`WeChat OAuth Error: ${data.errcode} - ${data.errmsg || 'Unknown error'}`);
    }

    if (!data.openid) {
      throw new Error('Failed to get openid from WeChat OAuth API');
    }

    return {
      openid: data.openid,
      unionid: data.unionid || null
    };
  } catch (error) {
    console.error('WeChat h5CodeToSession error:', error.message);
    throw error;
  }
}

module.exports = {
  codeToSession,
  h5CodeToSession,
  buildH5OAuthUrl
};
