const crypto = require('crypto');
const authConfig = require('../config/auth');

function base64urlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64urlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(value) {
  return crypto.createHmac('sha256', authConfig.secret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufferA, bufferB);
}

function issueToken(payload, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const ttlSec = options.ttlSec || authConfig.ttlSec;
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSec
  };
  const encodedPayload = base64urlEncode(JSON.stringify(tokenPayload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('token is required');
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('invalid token format');
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = sign(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) {
    throw new Error('invalid token signature');
  }

  const payload = JSON.parse(base64urlDecode(encodedPayload));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('token expired');
  }
  return payload;
}

module.exports = {
  issueToken,
  verifyToken
};
