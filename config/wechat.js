/**
 * WeChat Configuration
 * 微信配置文件
 */

// Get from environment variables or use defaults
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';

module.exports = {
  appId: WECHAT_APP_ID,
  appSecret: WECHAT_APP_SECRET,
  // WeChat API endpoint for code to session
  jscode2sessionUrl: 'https://api.weixin.qq.com/sns/jscode2session'
};
