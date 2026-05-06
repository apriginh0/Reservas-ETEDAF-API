const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const classReservationsRoutes = require('./routes/class_reservationsRoutes');
const salasRoutes = require('./routes/salasRoutes');
const userRoutes = require('./routes/userRoutes');
const { getAllowedOrigins, getAndroidAppPolicy, isProduction, port } = require('./config/appConfig');

const app = express();
const allowedOrigins = getAllowedOrigins();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Não permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/class_reservations', classReservationsRoutes);
app.use('/api/salas', salasRoutes);
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/app/bootstrap', (req, res) => {
  const platform = String(req.query.platform || 'web').toLowerCase();
  const version = typeof req.query.version === 'string' ? req.query.version.trim() : '';

  if (platform === 'android') {
    return res.status(200).json(getAndroidAppPolicy(version));
  }

  return res.status(200).json({
    platform,
    currentVersion: version || null,
    minimumSupportedVersion: null,
    latestVersion: null,
    updateRequired: false,
    updateAvailable: false,
    storeUrl: null,
    message: null,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  if (!isProduction) {
    console.error('Erro geral no servidor:', err.message);
  }

  res.status(500).json({ error: 'Erro interno no servidor' });
});

if (require.main === module) {
  app.listen(port, () => {
    if (!isProduction) {
      console.log(`Servidor rodando na porta ${port}`);
    }
  });
}

module.exports = app;
