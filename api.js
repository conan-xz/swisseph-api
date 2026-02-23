var swisseph = require ('swisseph');
var amap = require ('./services/amap');
var WebSocket = require('ws');
var wechatService = require ('./services/wechat');
var dashscopeService = require ('./services/dashscope');

swisseph.swe_set_ephe_path (process.env.SWISSEPH_EPHEMERIS_PATH || (__dirname + '/ephe'));

module.exports = api;

function api (server) {
	// Add WebSocket server
	const wss = new WebSocket.Server({ server, path: '/ws' });

	wss.on('connection', function (ws) {
		console.log('WebSocket client connected');

		ws.on('message', function (data) {
			try {
				const message = JSON.parse(data);
				console.log('swisseph message received', message);
				if (message.type === 'swisseph') {
					handleSwissephMessage(ws, message.data);
				} else if (message.type === 'amap') {
					handleAmapMessage(ws, message.data);
				} else if (message.type === 'wechat') {
					handleWechatMessage(ws, message.data);
				} else if (message.type === 'dashscope') {
					handleDashscopeMessage(ws, message.data);
				}
			} catch (error) {
				console.error('Error parsing WebSocket message:', error);
				ws.send(JSON.stringify({ type: 'error', result: { error: 'Invalid message format' } }));
			}
		});

		ws.on('close', function () {
			console.log('WebSocket client disconnected');
		});

		ws.on('error', function (error) {
			console.error('WebSocket error:', error);
		});
	});
};

/**
 * Handle DashScope WebSocket messages
 * 处理通义千问 WebSocket 消息
 *
 * @param {WebSocket} ws - WebSocket connection
 * @param {Array} args - Array of dashscope function calls, each with { func, args }
 */
async function handleDashscopeMessage(ws, args) {
	try {
		for (let i = 0; i < args.length; i++) {
			const func = args[i].func;
			const funcArgs = args[i].args;

			if (func === 'generateText') {
				const prompt = funcArgs[0]; // prompt is the first argument
				const options = funcArgs[1] || {}; // options is the second argument (optional)

				if (!prompt) {
					ws.send(JSON.stringify({
						type: 'dashscope result',
						result: {
							error: 'prompt is required',
							code: 'INVALID_PARAM'
						}
					}));
					continue;
				}

				try {
					const result = await dashscopeService.generateText(prompt, options);
					ws.send(JSON.stringify({
						type: 'dashscope result',
						result: {
							success: true,
							data: {
								content: result
							}
						}
					}));
				} catch (error) {
					console.error('DashScope WebSocket error:', error.message);
					ws.send(JSON.stringify({
						type: 'dashscope result',
						result: {
							error: error.message,
							code: error.message.includes('API_KEY not configured')
								? 'CONFIG_ERROR'
								: error.message.includes('DashScope API Error')
									? 'DASHSCOPE_API_ERROR'
									: 'INTERNAL_ERROR'
						}
					}));
				}
			} else {
				ws.send(JSON.stringify({
					type: 'dashscope result',
					result: {
						error: `Function ${func} not found`,
						code: 'FUNCTION_NOT_FOUND'
					}
				}));
			}
		}
	} catch (error) {
		ws.send(JSON.stringify({
			type: 'dashscope result',
			result: {
				error: error.message,
				code: 'INTERNAL_ERROR'
			}
		}));
	}
}

function handleSwissephMessage(ws, args) {
	var i;
	for (i = 0; i < args.length; i++) {
		const result = swisseph[args[i].func].apply(this, args[i].args);
		ws.send(JSON.stringify({ type: 'swisseph result', result: result }));
	}
}

async function handleAmapMessage(ws, args) {
	try {
		for (let i = 0; i < args.length; i++) {
			const func = args[i].func;
			const funcArgs = args[i].args;

			if (typeof amap[func] === 'function') {
				const result = await amap[func].apply(this, funcArgs);
				ws.send(JSON.stringify({ type: 'amap result', result: result }));
			} else {
				ws.send(JSON.stringify({ type: 'amap result', result: { error: `Function ${func} not found` } }));
			}
		}
	} catch (error) {
		ws.send(JSON.stringify({ type: 'amap result', result: { error: error.message } }));
	}
}

/**
 * Handle WeChat WebSocket messages
 * 处理微信 WebSocket 消息
 *
 * @param {WebSocket} ws - WebSocket connection
 * @param {Array} args - Array of wechat function calls, each with { func, args }
 */
async function handleWechatMessage(ws, args) {
	try {
		for (let i = 0; i < args.length; i++) {
			const func = args[i].func;
			const funcArgs = args[i].args;

			if (func === 'codeToSession') {
				const code = funcArgs[0]; // code is the first argument

				if (!code) {
					ws.send(JSON.stringify({
						type: 'wechat result',
						result: {
							error: 'code is required',
							code: 'INVALID_PARAM'
						}
					}));
					continue;
				}

				try {
					const result = await wechatService.codeToSession(code);
					ws.send(JSON.stringify({
						type: 'wechat result',
						result: {
							success: true,
							data: result
						}
					}));
				} catch (error) {
					console.error('WeChat WebSocket error:', error.message);
					ws.send(JSON.stringify({
						type: 'wechat result',
						result: {
							error: error.message,
							code: error.message.includes('APP_ID') || error.message.includes('APP_SECRET')
								? 'CONFIG_ERROR'
								: 'WECHAT_API_ERROR'
						}
					}));
				}
			} else {
				ws.send(JSON.stringify({
					type: 'wechat result',
					result: {
						error: `Function ${func} not found`,
						code: 'FUNCTION_NOT_FOUND'
					}
				}));
			}
		}
	} catch (error) {
		ws.send(JSON.stringify({
			type: 'wechat result',
			result: {
				error: error.message,
				code: 'INTERNAL_ERROR'
			}
		}));
	}
}