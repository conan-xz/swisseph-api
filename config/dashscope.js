/**
 * DashScope Configuration
 * 通义千问配置文件
 */

// Get from environment variables
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
const DASHSCOPE_MODEL = process.env.DASHSCOPE_MODEL || 'qwen-max';

module.exports = {
  apiKey: DASHSCOPE_API_KEY,
  // DashScope API endpoint for text generation
  apiUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  // Default model
  model: DASHSCOPE_MODEL
};
