const cors = require("cors");
require("dotenv").config();
const db = require("./config/dbTurso");
const routes = require('./routes');

const nodemailer = require('nodemailer');// Necessário para parsear JSON

const formData = require('form-data');
const Mailgun = require('mailgun.js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Logs de inicialização
console.log('Servidor iniciado. Configurando middlewares e rotas...');

// Rotas
app.use('/api', routes);

// Tratamento de erros genéricos
app.use((err, req, res, next) => {
  console.error('Erro geral no servidor:', err.message);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

// Criação automática das tabelas ao iniciar o servidor
// const initializeDatabase = async () => {
//   try {
//     await db.batch(
//       [
//         "CREATE TABLE IF NOT EXISTS projectors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)",
//         "CREATE TABLE IF NOT EXISTS speakers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)",
//         "CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, time TEXT, projector TEXT, speaker TEXT, reservedBy TEXT, objective TEXT)",
//         "INSERT OR IGNORE INTO projectors (name) VALUES ('Projetor 01'), ('Projetor 02'), ('Projetor 03')",
//         "INSERT OR IGNORE INTO speakers (name) VALUES ('Caixa de Som 01'), ('Caixa de Som 02')"
//       ],
//       "write"
//     );
//     console.log("Tabelas criadas/verificadas com sucesso!");
//   } catch (error) {
//     console.error("Erro ao criar/verificar tabelas:", error.message);
//   }
// };

// Rota básica para teste da conexão com o banco
app.get('/', async (req, res) => {
  try {
    const result = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tabelas disponíveis no banco:', result.rows);
    res.json({ tables: result.rows });
  } catch (error) {
    console.error('Erro ao buscar tabelas:', error.message);
    res.status(500).json({ error: error.message });
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

const sendEmail = async (to, subject, text) => {
  try {
    console.log('API Key:', process.env.MAILGUN_API_KEY);
    console.log('Domain:', process.env.MAILGUN_DOMAIN);

    const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: "Suporte <adm.etedaf@gmail.com>",
      to: [to],
      subject: subject,
      text: text,
      html: `<p>${text}</p>`
    }).then((res) => {
      console.log(res);
    }).catch((err) => {
      console.log(err);
    });
    console.log('E-mail enviado com sucesso:', response);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
  }
};

// Testando o envio
sendEmail('apriginh0@gmail.com', 'Teste Mailgun', 'Este é um teste de envio via Mailgun.');


// Inicie o servidor após garantir que o banco está configurado
app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
