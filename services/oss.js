const OSS = require('ali-oss');
const ossConfig = require('../config/oss');

let client = null;

function isConfigured() {
  return !!(ossConfig.accessKeyId && ossConfig.accessKeySecret && ossConfig.bucket);
}

function getClient() {
  if (!isConfigured()) {
    throw new Error('OSS is not configured. Set ALIYUN_OSS_ACCESS_KEY_ID/SECRET/BUCKET/REGION.');
  }
  if (!client) {
    client = new OSS({
      region: ossConfig.region,
      accessKeyId: ossConfig.accessKeyId,
      accessKeySecret: ossConfig.accessKeySecret,
      bucket: ossConfig.bucket,
      secure: true
    });
  }
  return client;
}

function guessExt(mimetype, fallbackExt) {
  if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') return 'jpg';
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  if (mimetype === 'image/gif') return 'gif';
  if (fallbackExt) return fallbackExt.replace(/^\./, '').toLowerCase();
  return 'jpg';
}

async function uploadAvatar(openid, buffer, { mimetype, originalname } = {}) {
  if (!openid) throw new Error('openid is required');
  if (!buffer || !buffer.length) throw new Error('avatar buffer is empty');

  const fallbackExt = originalname && originalname.includes('.')
    ? originalname.split('.').pop()
    : '';
  const ext = guessExt(mimetype, fallbackExt);
  const objectKey = `avatars/${openid}.${ext}`;

  await getClient().put(objectKey, buffer, {
    mime: mimetype || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    headers: {
      'Cache-Control': 'no-cache'
    }
  });

  return objectKey;
}

function signAvatarUrl(objectKey) {
  if (!objectKey) return null;
  if (!isConfigured()) return null;
  return getClient().signatureUrl(objectKey, {
    expires: ossConfig.signedUrlExpireSeconds
  });
}

module.exports = {
  isConfigured,
  uploadAvatar,
  signAvatarUrl
};
