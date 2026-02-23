/**
 * DashScope Service
 * 通义千问服务 - 调用 DashScope API
 */

const axios = require('axios');
const config = require('../config/dashscope');

/**
 * Call Qwen3-Max for text generation
 * 调用 Qwen3-Max 进行文本生成
 *
 * @param {string} prompt - Input prompt
 * @param {Object} options - Additional options
 * @param {string} options.model - Model name (default: qwen-max)
 * @param {string} options.resultFormat - Result format (default: message)
 * @returns {Promise<string>} - Generated text
 */
async function generateText(prompt, options = {}) {
  try {
    if (!prompt) {
      throw new Error('prompt is required');
    }

    if (!config.apiKey) {
      throw new Error('DashScope API_KEY not configured');
    }

    const model = options.model || config.model;
    const resultFormat = options.resultFormat || 'message';

    const response = await axios.post(
      config.apiUrl,
      {
        model: model,
        input: {
          messages: [
            { role: 'user', content: prompt }
          ]
        },
        parameters: {
          result_format: resultFormat
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    const { data } = response;

    // Check for error in response
    if (data.code && data.code !== 200) {
      throw new Error(`DashScope API Error: ${data.code} - ${data.message || 'Unknown error'}`);
    }

    if (!data.output || !data.output.choices || !data.output.choices[0]) {
      throw new Error('Invalid response from DashScope API');
    }

    return data.output.choices[0].message.content;
  } catch (error) {
    console.error('DashScope generateText error:', error.message);
    throw error;
  }
}

module.exports = {
  generateText
};
