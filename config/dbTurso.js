const { createClient } = require('@libsql/client');
require('dotenv').config();

console.log('Inicializando cliente Turso...');
console.log('URL do banco:', process.env.TURSO_DATABASE_URL);

const dbTurso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

module.exports = dbTurso;

