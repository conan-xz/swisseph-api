/**
 * WeChat Configuration
 * 微信配置文件
 */

// Get from environment variables or use defaults
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';
const WECHAT_H5_APP_ID = process.env.WECHAT_H5_APP_ID || WECHAT_APP_ID;
const WECHAT_H5_APP_SECRET = process.env.WECHAT_H5_APP_SECRET || WECHAT_APP_SECRET;
const WECHAT_OAUTH_SCOPE = process.env.WECHAT_OAUTH_SCOPE || 'snsapi_base';

module.exports = {
  appId: WECHAT_APP_ID,
  appSecret: WECHAT_APP_SECRET,
  h5AppId: WECHAT_H5_APP_ID,
  h5AppSecret: WECHAT_H5_APP_SECRET,
  oauthScope: WECHAT_OAUTH_SCOPE,
  // WeChat API endpoint for code to session
  jscode2sessionUrl: 'https://api.weixin.qq.com/sns/jscode2session',
  oauthAuthorizeUrl: 'https://open.weixin.qq.com/connect/oauth2/authorize',
  oauthAccessTokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token'
};
