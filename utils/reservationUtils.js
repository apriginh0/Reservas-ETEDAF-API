function normalizeReservationTimes(timeValue) {
  if (!timeValue || typeof timeValue !== 'string') {
    return [];
  }

  return timeValue
    .split(',')
    .map((time) => time.trim())
    .filter(Boolean);
}

function hasTimeConflict(existingTimeValue, requestedTimes) {
  const existingTimes = normalizeReservationTimes(existingTimeValue);
  return requestedTimes.some((time) => existingTimes.includes(time));
}

module.exports = {
  hasTimeConflict,
  normalizeReservationTimes,
};
