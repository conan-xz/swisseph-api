var express = require ('express');
var router = express.Router ();
var wechatService = require ('../services/wechat');
var dashscopeService = require ('../services/dashscope');

router.get ('/', function (req, res, next) {
	res.render ('index');
});

// Health check endpoint
router.get ('/api/health', function (req, res, next) {
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		service: 'swisseph-api'
	});
});

// Polling endpoint
router.get ('/api/polling', function (req, res, next) {
	res.json({
		status: 'active',
		timestamp: new Date().toISOString(),
		message: 'Polling service is running'
	});
});

// WeChat code to session endpoint
// 微信 code 换取 openid 和 session_key
router.post('/api/wechat/code2session', async function (req, res, next) {
	try {
		const { code } = req.body;

		if (!code) {
			return res.status(400).json({
				error: 'code is required',
				code: 'INVALID_PARAM'
			});
		}

		const result = await wechatService.codeToSession(code);

		res.json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('WeChat code2session error:', error);

		// Handle WeChat API specific errors
		if (error.message.includes('APP_ID') || error.message.includes('APP_SECRET')) {
			return res.status(500).json({
				error: 'WeChat configuration error',
				message: error.message,
				code: 'CONFIG_ERROR'
			});
		}

		// Handle WeChat API errors (invalid code, etc.)
		if (error.message.includes('WeChat API Error')) {
			return res.status(400).json({
				error: 'Invalid code or WeChat API error',
				message: error.message,
				code: 'WECHAT_API_ERROR'
			});
		}

		// General error
		res.status(500).json({
			error: 'Internal server error',
			message: error.message,
			code: 'INTERNAL_ERROR'
		});
	}
});

// DashScope analyze endpoint
// 调用 DashScope API 进行文本分析
router.post('/api/analyze', async function (req, res, next) {
	try {
		const { prompt } = req.body;
		const { model, resultFormat } = req.query;

		if (!prompt) {
			return res.status(400).json({
				error: 'prompt is required',
				code: 'INVALID_PARAM'
			});
		}

		const options = {};
		if (model) options.model = model;
		if (resultFormat) options.resultFormat = resultFormat;

		const result = await dashscopeService.generateText(prompt, options);

		res.json({
			success: true,
			data: {
				content: result
			}
		});
	} catch (error) {
		console.error('DashScope analyze error:', error);

		// Handle DashScope API key configuration error
		if (error.message.includes('API_KEY not configured')) {
			return res.status(500).json({
				error: 'DashScope configuration error',
				message: error.message,
				code: 'CONFIG_ERROR'
			});
		}

		// Handle DashScope API errors
		if (error.message.includes('DashScope API Error')) {
			return res.status(400).json({
				error: 'DashScope API error',
				message: error.message,
				code: 'DASHSCOPE_API_ERROR'
			});
		}

		// General error
		res.status(500).json({
			error: 'Internal server error',
			message: error.message,
			code: 'INTERNAL_ERROR'
		});
	}
});

module.exports = router;
