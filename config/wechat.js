/**
 * WeChat Configuration
 * 微信配置文件
 */

// Get from environment variables or use defaults
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || 'wx3d738eee512524be';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '28343d3cff5bc9e79837bc0391916f0a';

module.exports = {
  appId: WECHAT_APP_ID,
  appSecret: WECHAT_APP_SECRET,
  // WeChat API endpoint for code to session
  jscode2sessionUrl: 'https://api.weixin.qq.com/sns/jscode2session'
};
