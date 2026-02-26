#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require ('../app');
var debug = require ('debug') ('swisseph-api:server');
var http = require ('http');
var https = require ('https');
var fs = require ('fs');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort (process.env.PORT || '3000');
app.set ('port', port);

/**
 * Create HTTP/HTTPS server.
 */

var server;
var useHttps = process.env.SSL_ENABLED === 'true' || process.env.SSL_ENABLED === '1';

if (useHttps) {
  var sslOptions = {
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || './certs/astrology.work_bundle.crt'),
    key: fs.readFileSync(process.env.SSL_KEY_PATH || './certs/astrology.work.key')
  };
  server = https.createServer(sslOptions, app);
  console.log('HTTPS server enabled');
} else {
  server = http.createServer(app);
  console.log('HTTP server enabled');
}

/**
 * Socket.io API
 */
 
var api = require ('../api') (server);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen (port);
server.on ('error', onError);
server.on ('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort (val) {
  var port = parseInt (val, 10);

  if (isNaN (port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError (error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error (bind + ' requires elevated privileges');
      process.exit (1);
      break;
    case 'EADDRINUSE':
      console.error (bind + ' is already in use');
      process.exit (1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening () {
  var addr = server.address ();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug ('Listening on ' + bind);
}
