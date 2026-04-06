const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'change-me-in-production';
const AUTH_TOKEN_TTL_SEC = parseInt(process.env.AUTH_TOKEN_TTL_SEC || '604800', 10);

module.exports = {
  secret: AUTH_TOKEN_SECRET,
  ttlSec: Number.isNaN(AUTH_TOKEN_TTL_SEC) ? 604800 : AUTH_TOKEN_TTL_SEC
};
