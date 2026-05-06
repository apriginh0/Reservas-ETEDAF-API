const test = require('node:test');
const assert = require('node:assert/strict');

const { toPublicTeacher, toSafeUser } = require('../utils/userSerializers');

test('toSafeUser removes password-like data', () => {
  const safeUser = toSafeUser({
    id: 1,
    name: 'Professor Teste',
    email: 'prof@example.com',
    password: 'hashed-password',
    role: 'teacher',
    approved: 1,
  });

  assert.deepEqual(safeUser, {
    id: 1,
    name: 'Professor Teste',
    email: 'prof@example.com',
    role: 'teacher',
    approved: 1,
  });
});

test('toPublicTeacher returns only public teacher data', () => {
  assert.deepEqual(
    toPublicTeacher({ id: 7, name: 'Maria', email: 'maria@example.com' }),
    { id: 7, name: 'Maria' }
  );
});
