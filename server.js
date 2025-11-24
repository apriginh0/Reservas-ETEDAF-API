const express = require('express');
const cors = require("cors");
require("dotenv").config();
const db = require("./config/dbTurso");
const salasRoutes = require('./routes/salasRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const classReservationsRoutes = require('./routes/class_reservationsRoutes');
const cookieParser = require('cookie-parser');

const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cookieParser()); // Middleware crucial para ler cookies
const FRONTEND_URL = process.env.FRONTEND_URL; // Ajuste para seu frontend local
const allowedOrigins = [
  FRONTEND_URL,             // Seu frontend na Vercel (ex: "https://www.etedaf.com.br")
  'https://reservas-etedaf-escola-etedafs-projects.vercel.app',
  'http://localhost:8100',
  'https://localhost',
  'https://localhost/login',
  'http://localhost:8080',
  'http://localhost:3000',
  null                               // Para apps Android
];

// Middlewares de segurança
app.use(helmet()); // Ativa proteções padrão

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      console.log('[CORS] Origem recebida:', origin); // 👀 Log para depuração
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('[CORS] Origem bloqueada:', origin);
        callback(new Error('Não permitido por CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['set-cookie', 'clear-site-data'] // Explicita headers de cookies
  })
);

// Rotas
app.use('/api/auth', authRoutes);

app.use('/api/class_reservations', classReservationsRoutes);

app.use('/api/salas', salasRoutes);

app.use('/api/users', userRoutes);

// Tratamento de erros genéricos
app.use((err, req, res, next) => {
  console.error('Erro geral no servidor:', err.message);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

// Rota básica para teste da conexão com o banco
app.get('/', async (req, res) => {
  try {
    const result = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
    res.json({ tables: result.rows });
  } catch (error) {
    console.error('Erro ao buscar tabelas:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/class_reservations', async (req, res) => {
  const { date, classId } = req.query;
  try {
    const [rows] = await db.execute(
      'SELECT time FROM class_reservations WHERE date = ? AND classId = ?',
      [date, classId]
    );
    res.json(rows || []);
  } catch (error) {
    console.error('Erro ao buscar reservas:', error);
    res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
});



// Endpoint para inserir uma reserva
app.post("/reservations", async (req, res) => {
  const { date, time, projector, speaker, reservedBy, objective } = req.body;

  if (!date || !time || !projector || !reservedBy || !objective) {
    return res.status(400).json({ error: "Campos obrigatórios estão faltando" });
  }

  try {
    await db.execute({
      sql: `INSERT INTO reservations (date, time, projector, speaker, reservedBy, objective)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [date, time, projector, speaker, reservedBy, objective],
    });
    res.status(201).json({ message: "Reserva criada com sucesso" });
  } catch (error) {
    console.error("Erro ao inserir reserva:", error.message);
    res.status(500).json({ error: "Erro ao criar reserva" });
  }
});



// Configuração customizada do helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "trusted-scripts.com"],
      },
    },
  })
);

// HSTS (HTTP Strict Transport Security)
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});

// Inicie o servidor após garantir que o banco está configurado
app.listen(PORT, () => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`Servidor rodando na porta ${PORT}`);
  }
});
