const tokenService = require('../services/token');

function authRequired(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED'
      });
    }

    const payload = tokenService.verifyToken(token);
    req.auth = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message,
      code: 'AUTH_INVALID'
    });
  }
}

function getOptionalAuth(req, _res, next) {
  try {
    const authorization = req.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');
    if (scheme === 'Bearer' && token) {
      req.auth = tokenService.verifyToken(token);
    }
  } catch (error) {
    req.auth = null;
  }
  next();
}

module.exports = {
  authRequired,
  getOptionalAuth
};
