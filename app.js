var express = require ('express');
var path = require ('path');
var favicon = require ('serve-favicon');
var logger = require ('morgan');
var cookieParser = require ('cookie-parser');
var bodyParser = require ('body-parser');

var routes = require ('./routes/index');
var authRoutes = require('./routes/auth');
var userRoutes = require('./routes/user');
var synastryRoutes = require('./routes/synastry');

var app = express ();
app.set('etag', false);
app.set('trust proxy', true);

app.use(function (req, res, next) {
    var origin = req.headers.origin || '';
    var allowedOrigins = [
        'https://www.astrology.work',
        'https://astrology.work',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use (logger ('dev'));
app.use (bodyParser.json ());
app.use (bodyParser.urlencoded ({ extended: false }));
app.use (cookieParser ());
app.use (require ('less-middleware') (path.join (__dirname, 'public')));
app.use (express.static (path.join (__dirname, 'public')));

app.use('/', routes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/synastry', synastryRoutes);

// catch 404 and forward to error handler
app.use (function (req, res, next) {
    var err = new Error ('Not Found');
    err.status = 404;
    next (err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get ('env') === 'development') {
    app.use (function (err, req, res, next) {
        res.status (err.status || 500);
        res.render ('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use (function (err, req, res, next) {
    res.status (err.status || 500);
    res.render ('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
