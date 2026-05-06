const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:8100',
  'http://localhost:4200',
  'http://localhost:3000',
  'http://127.0.0.1:8100',
  'http://127.0.0.1:4200',
  'http://127.0.0.1:3000',
];

const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8100';
const jwtSecret = process.env.JWT_SECRET;
const jwtResetSecret = process.env.JWT_RESET_SECRET || jwtSecret;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
const resetTokenExpiresIn = process.env.RESET_TOKEN_EXPIRES_IN || '1h';
const refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '15d';
const refreshTokenTtlMs = durationToMs(refreshTokenExpiresIn, 15 * 24 * 60 * 60 * 1000);

function durationToMs(duration, fallbackMs) {
  if (!duration || typeof duration !== 'string') {
    return fallbackMs;
  }

  const match = duration.trim().match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

function getAllowedOrigins() {
  return [...new Set([frontendUrl, ...DEFAULT_LOCAL_ORIGINS].filter(Boolean))];
}

function getAccessTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: durationToMs(jwtExpiresIn, 15 * 60 * 1000),
    path: '/',
  };
}

function getAccessTokenClearCookieOptions() {
  const { maxAge, ...options } = getAccessTokenCookieOptions();
  return options;
}

function getRefreshTokenExpiryDate() {
  return new Date(Date.now() + refreshTokenTtlMs);
}

function getRefreshTokenClearCookieOptions() {
  return {
    ...getAccessTokenClearCookieOptions(),
  };
}

module.exports = {
  frontendUrl,
  getAccessTokenClearCookieOptions,
  getAccessTokenCookieOptions,
  getAllowedOrigins,
  getRefreshTokenExpiryDate,
  getRefreshTokenClearCookieOptions,
  isProduction,
  jwtExpiresIn,
  jwtResetSecret,
  jwtSecret,
  port: Number(process.env.PORT) || 5000,
  refreshTokenExpiresIn,
  refreshTokenTtlMs,
  resetTokenExpiresIn,
};
