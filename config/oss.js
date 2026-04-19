module.exports = {
  region: process.env.ALIYUN_OSS_REGION || 'oss-cn-beijing',
  bucket: process.env.ALIYUN_OSS_BUCKET || 'swisseph',
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || '',
  signedUrlExpireSeconds: Number(process.env.ALIYUN_OSS_SIGNED_URL_TTL || 7 * 24 * 3600)
};
