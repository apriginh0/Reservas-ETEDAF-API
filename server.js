const express = require('express');
const cors = require("cors");
require("dotenv").config();
const db = require("./config/dbTurso");
const salasRoutes = require('./routes/salasRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const classReservationsRoutes = require('./routes/class_reservationsRoutes');

const formData = require('form-data');
const Mailgun = require('mailgun.js');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL; // Ajuste para seu frontend local
const allowedOrigins = [
  FRONTEND_URL,             // Seu frontend na Vercel (ex: "https://www.etedaf.com.br")
  null                      // Permitir chamadas de apps móveis
];

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
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

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

// const sendEmail = async (to, subject, text) => {
//   try {
//     console.log('API Key:', process.env.MAILGUN_API_KEY);
//     console.log('Domain:', process.env.MAILGUN_DOMAIN);

//     const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
//       from: "Suporte <adm.etedaf@gmail.com>",
//       to: [to],
//       subject: subject,
//       text: text,
//       html: `<p>${text}</p>`
//     }).then((res) => {
//       console.log(res);
//     }).catch((err) => {
//       console.log(err);
//     });
//     console.log('E-mail enviado com sucesso:', response);
//   } catch (error) {
//     console.error('Erro ao enviar e-mail:', error);
//   }
// };

// Testando o envio
// sendEmail('apriginh0@gmail.com', 'Teste Mailgun', 'Este é um teste de envio via Mailgun.');


// Inicie o servidor após garantir que o banco está configurado
app.listen(PORT, () => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`Servidor rodando na porta ${PORT}`);
  }
});
