const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-secret';
process.env.JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || 'integration-reset-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
process.env.RESET_TOKEN_EXPIRES_IN = process.env.RESET_TOKEN_EXPIRES_IN || '1h';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
process.env.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://integration-test.turso.io';
process.env.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'integration-test-token';
process.env.ANDROID_MINIMUM_SUPPORTED_VERSION = process.env.ANDROID_MINIMUM_SUPPORTED_VERSION || '2.2';
process.env.ANDROID_LATEST_VERSION = process.env.ANDROID_LATEST_VERSION || '2.3';
process.env.ANDROID_STORE_URL =
  process.env.ANDROID_STORE_URL || 'https://play.google.com/store/apps/details?id=br.com.etedaf.reservas';

const db = require('../config/dbTurso');
const app = require('../server');

const originalExecute = db.execute;

function createDbMock() {
  const state = {
    nextUserId: 3,
    nextReservationId: 1,
    nextRefreshTokenId: 1,
    users: [
      {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        password: bcrypt.hashSync('AdminPass123', 10),
        role: 'admin',
        approved: 1,
      },
      {
        id: 2,
        name: 'Teacher User',
        email: 'teacher@example.com',
        password: bcrypt.hashSync('TeacherPass123', 10),
        role: 'teacher',
        approved: 1,
      },
    ],
    refreshTokens: [],
    reservations: [],
    classes: [{ id: 1, name: 'LabMóvel' }],
  };

  function projectUser(user, fields) {
    if (!user) {
      return null;
    }

    return fields.reduce((acc, field) => {
      acc[field] = user[field];
      return acc;
    }, {});
  }

  function result(rows = [], rowsAffected = 0) {
    return { rows, rowsAffected };
  }

  async function execute(query) {
    const sql = typeof query === 'string' ? query : query.sql;
    const args = typeof query === 'string' ? [] : (query.args || []);
    const normalized = sql.replace(/\s+/g, ' ').trim();

    if (normalized === 'SELECT * FROM users WHERE email = ?') {
      const user = state.users.find((item) => item.email === args[0]);
      return result(user ? [user] : []);
    }

    if (normalized === 'SELECT id FROM users WHERE email = ?') {
      const user = state.users.find((item) => item.email === args[0]);
      return result(user ? [{ id: user.id }] : []);
    }

    if (normalized === 'SELECT id, email FROM users WHERE email = ?') {
      const user = state.users.find((item) => item.email === args[0]);
      return result(user ? [{ id: user.id, email: user.email }] : []);
    }

    if (normalized === 'INSERT INTO users (name, email, password, role, approved) VALUES (?, ?, ?, ?, ?)') {
      const user = {
        id: state.nextUserId++,
        name: args[0],
        email: args[1],
        password: args[2],
        role: args[3],
        approved: args[4],
      };
      state.users.push(user);
      return result([], 1);
    }

    if (normalized === 'SELECT id, role, approved, password FROM users WHERE id = ?') {
      const user = state.users.find((item) => item.id === Number(args[0]));
      return result(user ? [projectUser(user, ['id', 'role', 'approved', 'password'])] : []);
    }

    if (normalized === 'SELECT id, name, email, role, approved, password FROM users WHERE id = ?') {
      const user = state.users.find((item) => item.id === Number(args[0]));
      return result(user ? [projectUser(user, ['id', 'name', 'email', 'role', 'approved', 'password'])] : []);
    }

    if (normalized === 'SELECT id, name, email, role, approved FROM users WHERE id = ?') {
      const user = state.users.find((item) => item.id === Number(args[0]));
      return result(user ? [projectUser(user, ['id', 'name', 'email', 'role', 'approved'])] : []);
    }

    if (normalized === 'SELECT id FROM users WHERE id = ?') {
      const user = state.users.find((item) => item.id === Number(args[0]));
      return result(user ? [{ id: user.id }] : []);
    }

    if (normalized === 'UPDATE users SET password = ? WHERE id = ?') {
      const user = state.users.find((item) => item.id === Number(args[1]));
      if (!user) {
        return result([], 0);
      }
      user.password = args[0];
      return result([], 1);
    }

    if (normalized === 'DELETE FROM refresh_tokens WHERE user_id = ?') {
      const before = state.refreshTokens.length;
      state.refreshTokens = state.refreshTokens.filter((item) => item.user_id !== Number(args[0]));
      return result([], before - state.refreshTokens.length);
    }

    if (normalized === 'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)') {
      state.refreshTokens.push({
        id: state.nextRefreshTokenId++,
        user_id: Number(args[0]),
        token: args[1],
        expires_at: args[2],
      });
      return result([], 1);
    }

    if (normalized.includes('FROM refresh_tokens WHERE token = ? AND expires_at > datetime(\'now\')')) {
      const tokenRow = state.refreshTokens.find((item) => item.token === args[0]);
      return result(tokenRow ? [{ id: tokenRow.id, user_id: tokenRow.user_id }] : []);
    }

    if (normalized === 'DELETE FROM refresh_tokens WHERE id = ?') {
      const before = state.refreshTokens.length;
      state.refreshTokens = state.refreshTokens.filter((item) => item.id !== Number(args[0]));
      return result([], before - state.refreshTokens.length);
    }

    if (normalized.includes('FROM users WHERE approved = 0 ORDER BY name ASC')) {
      const rows = state.users
        .filter((item) => item.approved === 0)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => projectUser(item, ['id', 'name', 'email', 'role', 'approved']));
      return result(rows);
    }

    if (normalized === 'UPDATE users SET approved = 1 WHERE id = ?') {
      const user = state.users.find((item) => item.id === Number(args[0]));
      if (!user) {
        return result([], 0);
      }
      user.approved = 1;
      return result([], 1);
    }

    if (normalized === 'DELETE FROM users WHERE id = ?') {
      const before = state.users.length;
      state.users = state.users.filter((item) => item.id !== Number(args[0]));
      return result([], before - state.users.length);
    }

    if (normalized.includes('FROM users WHERE approved = 1 ORDER BY name ASC')) {
      const rows = state.users
        .filter((item) => item.approved === 1)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => projectUser(item, ['id', 'name', 'email', 'role', 'approved']));
      return result(rows);
    }

    if (normalized === 'UPDATE users SET role = ? WHERE id = ?') {
      const user = state.users.find((item) => item.id === Number(args[1]));
      if (!user) {
        return result([], 0);
      }
      user.role = args[0];
      return result([], 1);
    }

    if (normalized.includes('SELECT id, name FROM users WHERE approved = 1 ORDER BY name ASC')) {
      const rows = state.users
        .filter((item) => item.approved === 1)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({ id: item.id, name: item.name }));
      return result(rows);
    }

    if (normalized === 'SELECT role FROM users WHERE id = ?') {
      const user = state.users.find((item) => item.id === Number(args[0]));
      return result(user ? [{ role: user.role }] : []);
    }

    if (normalized.includes('SELECT id, time FROM class_reservations WHERE classId = ? AND date = ?')) {
      const rows = state.reservations
        .filter((item) => item.classId === Number(args[0]) && item.date === args[1])
        .map((item) => ({ id: item.id, time: item.time }));
      return result(rows);
    }

    if (normalized.includes('INSERT INTO class_reservations (classId, date, time, teacherId, subject, classYear, objective, createdAt)')) {
      const reservation = {
        id: state.nextReservationId++,
        classId: Number(args[0]),
        date: args[1],
        time: args[2],
        teacherId: Number(args[3]),
        subject: args[4],
        classYear: args[5],
        objective: args[6],
        createdAt: args[7],
      };
      state.reservations.push(reservation);
      return result([], 1);
    }

    if (normalized === 'DELETE FROM class_reservations WHERE id = ?') {
      const before = state.reservations.length;
      state.reservations = state.reservations.filter((item) => item.id !== Number(args[0]));
      return result([], before - state.reservations.length);
    }

    if (
      normalized ===
      'SELECT id, classId, date, time, teacherId, subject, classYear, objective, createdAt FROM class_reservations WHERE id = ?'
    ) {
      const reservation = state.reservations.find((item) => item.id === Number(args[0]));
      return result(reservation ? [reservation] : []);
    }

    if (normalized.includes('FROM class_reservations') && normalized.includes('ORDER BY date ASC, classId ASC, time ASC')) {
      let rows = [...state.reservations];
      if (args.length >= 1 && normalized.includes('WHERE date = ?')) {
        rows = rows.filter((item) => item.date === args[0]);
      }
      if (args.length === 2 && normalized.includes('classId = ?')) {
        rows = rows.filter((item) => item.classId === Number(args[1]));
      }
      if (args.length === 1 && normalized.includes('WHERE classId = ?')) {
        rows = rows.filter((item) => item.classId === Number(args[0]));
      }
      rows.sort((a, b) => `${a.date}-${a.classId}-${a.time}`.localeCompare(`${b.date}-${b.classId}-${b.time}`));
      return result(rows);
    }

    if (normalized === 'UPDATE class_reservations SET time = ? WHERE id = ?') {
      const reservation = state.reservations.find((item) => item.id === Number(args[1]));
      if (!reservation) {
        return result([], 0);
      }
      reservation.time = args[0];
      return result([], 1);
    }

    if (normalized === 'SELECT id, name FROM classes') {
      return result(state.classes);
    }

    throw new Error(`Unhandled SQL in integration test: ${normalized}`);
  }

  return { execute, state };
}

function createCookieClient(baseUrl) {
  const cookies = new Map();

  return {
    async request(path, options = {}) {
      const headers = new Headers(options.headers || {});
      if (cookies.size > 0) {
        headers.set(
          'cookie',
          Array.from(cookies.entries()).map(([key, value]) => `${key}=${value}`).join('; ')
        );
      }

      if (options.json && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(`${baseUrl}${path}`, {
        method: options.method || 'GET',
        headers,
        body: options.json ? JSON.stringify(options.json) : options.body,
      });

      const setCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
      for (const cookie of setCookies) {
        const [pair] = cookie.split(';');
        const [name, value] = pair.split('=');
        if (!value) {
          cookies.delete(name);
        } else {
          cookies.set(name, value);
        }
      }

      const text = await response.text();
      let body = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }

      return { status: response.status, body };
    },
  };
}

test('health endpoint returns ok', async (t) => {
  const dbMock = createDbMock();
  db.execute = dbMock.execute;
  const server = app.listen(0);
  t.after(() => {
    server.close();
    db.execute = originalExecute;
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('app bootstrap reports when an Android version must update', async (t) => {
  const dbMock = createDbMock();
  db.execute = dbMock.execute;
  const server = app.listen(0);
  t.after(() => {
    server.close();
    db.execute = originalExecute;
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(
    `${baseUrl}/api/app/bootstrap?platform=android&version=2.1`
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    platform: 'android',
    currentVersion: '2.1',
    minimumSupportedVersion: '2.2',
    latestVersion: '2.3',
    updateRequired: true,
    updateAvailable: true,
    storeUrl: 'https://play.google.com/store/apps/details?id=br.com.etedaf.reservas',
    message: 'Uma nova versão do aplicativo está disponível. Atualize para continuar usando o sistema.',
  });
});

test('teacher is blocked from admin routes while admin can approve pending users', async (t) => {
  const dbMock = createDbMock();
  db.execute = dbMock.execute;
  const server = app.listen(0);
  t.after(() => {
    server.close();
    db.execute = originalExecute;
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const teacher = createCookieClient(baseUrl);
  const admin = createCookieClient(baseUrl);

  let response = await teacher.request('/api/auth/login', {
    method: 'POST',
    json: { email: 'teacher@example.com', password: 'TeacherPass123' },
  });
  assert.equal(response.status, 200);

  response = await teacher.request('/api/users/pending');
  assert.equal(response.status, 403);

  response = await admin.request('/api/auth/login', {
    method: 'POST',
    json: { email: 'admin@example.com', password: 'AdminPass123' },
  });
  assert.equal(response.status, 200);

  response = await admin.request('/api/auth/register', {
    method: 'POST',
    json: {
      name: 'Pending Teacher',
      email: 'pending@example.com',
      password: 'TeacherPass123',
    },
  });
  assert.equal(response.status, 201);

  response = await admin.request('/api/users/pending');
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].email, 'pending@example.com');

  response = await admin.request(`/api/users/approve/${response.body[0].id}`, {
    method: 'PUT',
  });
  assert.equal(response.status, 200);

  response = await admin.request('/api/users/approved');
  assert.equal(response.status, 200);
  assert.ok(response.body.some((user) => user.email === 'pending@example.com'));
});

test('reservation ownership is enforced and admins can override', async (t) => {
  const dbMock = createDbMock();
  db.execute = dbMock.execute;
  const server = app.listen(0);
  t.after(() => {
    server.close();
    db.execute = originalExecute;
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const teacher = createCookieClient(baseUrl);
  const admin = createCookieClient(baseUrl);
  const otherTeacher = createCookieClient(baseUrl);

  let response = await admin.request('/api/auth/login', {
    method: 'POST',
    json: { email: 'admin@example.com', password: 'AdminPass123' },
  });
  assert.equal(response.status, 200);

  response = await admin.request('/api/auth/register', {
    method: 'POST',
    json: {
      name: 'Other Teacher',
      email: 'other@example.com',
      password: 'TeacherPass123',
    },
  });
  assert.equal(response.status, 201);

  response = await admin.request('/api/users/pending');
  const otherPending = response.body.find((user) => user.email === 'other@example.com');
  response = await admin.request(`/api/users/approve/${otherPending.id}`, { method: 'PUT' });
  assert.equal(response.status, 200);

  response = await teacher.request('/api/auth/login', {
    method: 'POST',
    json: { email: 'teacher@example.com', password: 'TeacherPass123' },
  });
  assert.equal(response.status, 200);

  response = await otherTeacher.request('/api/auth/login', {
    method: 'POST',
    json: { email: 'other@example.com', password: 'TeacherPass123' },
  });
  assert.equal(response.status, 200);

  response = await teacher.request('/api/class_reservations', {
    method: 'POST',
    json: {
      classId: 1,
      date: '2030-12-30',
      time: '07:00',
      subject: 'Matematica',
      classYear: '3A',
      objective: 'Teste de integracao',
      createdAt: '2030-12-01 10:00:00',
    },
  });
  assert.equal(response.status, 201);

  response = await teacher.request('/api/class_reservations?date=2030-12-30&classId=1');
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  const reservationId = response.body[0].id;

  response = await otherTeacher.request(`/api/class_reservations/${reservationId}`, {
    method: 'PUT',
    json: { time: '08:00' },
  });
  assert.equal(response.status, 403);

  response = await otherTeacher.request(`/api/class_reservations/${reservationId}`, {
    method: 'DELETE',
  });
  assert.equal(response.status, 403);

  response = await admin.request(`/api/class_reservations/${reservationId}`, {
    method: 'PUT',
    json: { time: '08:00' },
  });
  assert.equal(response.status, 200);

  response = await admin.request(`/api/class_reservations/${reservationId}`, {
    method: 'DELETE',
  });
  assert.equal(response.status, 200);
});

test('password reset invalidates the previous authenticated session', async (t) => {
  const dbMock = createDbMock();
  db.execute = dbMock.execute;
  const server = app.listen(0);
  t.after(() => {
    server.close();
    db.execute = originalExecute;
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const teacher = createCookieClient(baseUrl);

  let response = await teacher.request('/api/auth/login', {
    method: 'POST',
    json: { email: 'teacher@example.com', password: 'TeacherPass123' },
  });
  assert.equal(response.status, 200);

  response = await teacher.request('/api/auth/me');
  assert.equal(response.status, 200);

  const resetToken = jwt.sign(
    { id: 2, type: 'password_reset' },
    process.env.JWT_RESET_SECRET,
    { expiresIn: process.env.RESET_TOKEN_EXPIRES_IN }
  );

  response = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, newPassword: 'TeacherPass999' }),
  });
  assert.equal(response.status, 200);

  response = await teacher.request('/api/auth/me');
  assert.equal(response.status, 401);

  const freshLogin = createCookieClient(baseUrl);
  response = await freshLogin.request('/api/auth/login', {
    method: 'POST',
    json: { email: 'teacher@example.com', password: 'TeacherPass999' },
  });
  assert.equal(response.status, 200);
});
