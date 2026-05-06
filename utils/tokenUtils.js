const crypto = require('crypto');

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function createPasswordFingerprint(passwordHash, secret) {
  if (!passwordHash || !secret) {
    return null;
  }

  return crypto
    .createHash('sha256')
    .update(`${passwordHash}:${secret}`)
    .digest('hex');
}

module.exports = {
  createPasswordFingerprint,
  generateRefreshToken,
  hashRefreshToken,
};
