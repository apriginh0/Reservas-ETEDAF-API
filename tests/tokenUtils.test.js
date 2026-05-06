const test = require('node:test');
const assert = require('node:assert/strict');

const { createPasswordFingerprint, generateRefreshToken, hashRefreshToken } = require('../utils/tokenUtils');

test('generateRefreshToken returns a long random string', () => {
  const token = generateRefreshToken();
  assert.equal(typeof token, 'string');
  assert.ok(token.length >= 64);
});

test('hashRefreshToken is deterministic for the same input', () => {
  const token = 'sample-refresh-token';
  assert.equal(hashRefreshToken(token), hashRefreshToken(token));
});

test('hashRefreshToken changes when the token changes', () => {
  assert.notEqual(hashRefreshToken('token-a'), hashRefreshToken('token-b'));
});

test('createPasswordFingerprint is deterministic for the same inputs', () => {
  assert.equal(
    createPasswordFingerprint('password-hash', 'jwt-secret'),
    createPasswordFingerprint('password-hash', 'jwt-secret')
  );
});

test('createPasswordFingerprint changes when the password hash changes', () => {
  assert.notEqual(
    createPasswordFingerprint('password-hash-a', 'jwt-secret'),
    createPasswordFingerprint('password-hash-b', 'jwt-secret')
  );
});
