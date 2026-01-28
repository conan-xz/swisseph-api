var swisseph = require ('swisseph');
var amap = require ('./amap');

swisseph.swe_set_ephe_path (process.env.SWISSEPH_EPHEMERIS_PATH || (__dirname + '/ephe'));

module.exports = api;

function api (server) {
	io = require('socket.io') (server);
	io.on ('connection', function (socket) {
  		socket.on('swisseph', function (data) {
  			swissephHandler (socket, data);
  		});
  		socket.on('amap', function (data) {
  			amapHandler (socket, data);
  		});
	});
};

function swissephHandler (socket, args) {
	var i;

	for (i = 0; i < args.length; i ++) {
	    socket.emit ('swisseph result', swisseph [args [i].func].apply (this, args [i].args));
	};
};

async function amapHandler (socket, args) {
	try {
		for (let i = 0; i < args.length; i++) {
			const func = args[i].func;
			const funcArgs = args[i].args;

			if (typeof amap[func] === 'function') {
				const result = await amap[func].apply(this, funcArgs);
				socket.emit('amap result', result);
			} else {
				socket.emit('amap result', { error: `Function ${func} not found` });
			}
		}
	} catch (error) {
		socket.emit('amap result', { error: error.message });
	}
};
