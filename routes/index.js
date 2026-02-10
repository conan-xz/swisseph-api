var express = require ('express');
var router = express.Router ();
var wechatService = require ('../services/wechat');

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

module.exports = router;
