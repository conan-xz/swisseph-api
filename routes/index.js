var express = require ('express');
var router = express.Router ();

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

module.exports = router;
