const test = require('node:test');
const assert = require('node:assert/strict');

const {
  hasTimeConflict,
  normalizeReservationTimes,
} = require('../utils/reservationUtils');

test('normalizeReservationTimes returns trimmed values', () => {
  assert.deepEqual(
    normalizeReservationTimes('Aula 01, Aula 02, Noite 1'),
    ['Aula 01', 'Aula 02', 'Noite 1']
  );
});

test('normalizeReservationTimes ignores empty values', () => {
  assert.deepEqual(normalizeReservationTimes('Aula 01, , Aula 02'), ['Aula 01', 'Aula 02']);
});

test('hasTimeConflict detects overlapping schedules', () => {
  assert.equal(hasTimeConflict('Aula 01, Aula 02', ['Aula 02']), true);
});

test('hasTimeConflict returns false when there is no overlap', () => {
  assert.equal(hasTimeConflict('Aula 01, Aula 02', ['Noite 1']), false);
});
