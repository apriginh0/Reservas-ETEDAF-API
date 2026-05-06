const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost',
  'http://localhost:8100',
  'http://localhost:4200',
  'http://localhost:3000',
  'https://localhost',
  'https://localhost:8100',
  'https://localhost:4200',
  'https://localhost:3000',
  'capacitor://localhost',
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
const androidMinimumSupportedVersion = process.env.ANDROID_MINIMUM_SUPPORTED_VERSION || '2.2';
const androidLatestVersion = process.env.ANDROID_LATEST_VERSION || androidMinimumSupportedVersion;
const androidStoreUrl =
  process.env.ANDROID_STORE_URL || 'https://play.google.com/store/apps/details?id=br.com.etedaf.reservas';
const androidUpdateMessage =
  process.env.ANDROID_UPDATE_MESSAGE
  || 'Uma nova versão do aplicativo está disponível. Atualize para continuar usando o sistema.';

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

function normalizeVersion(version) {
  if (!version || typeof version !== 'string') {
    return [];
  }

  return version
    .split('.')
    .map((segment) => Number.parseInt(segment, 10))
    .filter((segment) => Number.isFinite(segment));
}

function compareVersions(currentVersion, targetVersion) {
  const left = normalizeVersion(currentVersion);
  const right = normalizeVersion(targetVersion);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const current = left[index] || 0;
    const target = right[index] || 0;

    if (current > target) {
      return 1;
    }

    if (current < target) {
      return -1;
    }
  }

  return 0;
}

function getAndroidAppPolicy(currentVersion) {
  const hasCurrentVersion = typeof currentVersion === 'string' && currentVersion.trim().length > 0;
  const updateRequired = hasCurrentVersion
    ? compareVersions(currentVersion, androidMinimumSupportedVersion) < 0
    : false;
  const updateAvailable = hasCurrentVersion
    ? compareVersions(currentVersion, androidLatestVersion) < 0
    : false;

  return {
    platform: 'android',
    currentVersion: currentVersion || null,
    minimumSupportedVersion: androidMinimumSupportedVersion,
    latestVersion: androidLatestVersion,
    updateRequired,
    updateAvailable,
    storeUrl: androidStoreUrl,
    message: androidUpdateMessage,
  };
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
  androidLatestVersion,
  androidMinimumSupportedVersion,
  androidStoreUrl,
  androidUpdateMessage,
  compareVersions,
  frontendUrl,
  getAccessTokenClearCookieOptions,
  getAccessTokenCookieOptions,
  getAllowedOrigins,
  getAndroidAppPolicy,
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
