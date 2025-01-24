const jwt = require('jsonwebtoken');
const db = require('../config/dbTurso'); // Configuração do banco de dados

// Criar uma nova reserva
const createReservation = async (req, res) => {
  console.log('Recebida requisição POST em /api/class_reservations');
  console.log('Dados recebidos na requisição:', req.body);

  const { classId, date, time, subject, classYear, objective } = req.body;
  console.log( { classId, date, time, subject, classYear, objective });

  try {
   // Decodificar o token JWT para obter o ID do professor
   const token = req.headers.authorization?.split(' ')[1];
   if (!token) {
     return res.status(401).json({ error: 'Token não fornecido.' });
   }

   const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
   const teacherId = decodedToken.id; // Certifique-se de que o token inclui 'id'
   console.log(teacherId);

    // Verifica se todos os campos obrigatórios foram fornecidos
    if (!classId || !date || !time || !subject || !classYear || !objective) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // Valida que o usuário autenticado é um professor
    const userRoleQuery = 'SELECT role FROM users WHERE id = ?';
    const userRoleResult = await db.execute({
      sql: userRoleQuery,
      args: [teacherId],
    });

    if (userRoleResult.rows[0]?.role !== 'teacher' && userRoleResult.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Somente professores podem criar reservas.' });
    }

    const query = `
      INSERT INTO class_reservations (classId, date, time, teacherId, subject, classYear, objective)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [classId, date, time, teacherId, subject, classYear, objective];

    const result = await db.execute({
      sql: query,
      args: params,
    });

    if (!result || !result.rowsAffected) {
      console.error('Erro ao inserir a reserva no banco:', result);
      return res.status(500).json({ error: 'Erro ao criar a reserva.' });
    }

    console.log('Reserva criada com sucesso:', result);
    res.status(201).json({ message: 'Reserva criada com sucesso!' });
  } catch (error) {
    console.error('Erro ao criar reserva:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Buscar todas as reservas (opcional)
const getAllReservations = async (req, res) => {
  console.log('Recebida requisição GET em /api/class_reservations');
  try {
    const query = 'SELECT * FROM class_reservations';
    const result = await db.execute(query);

    if (!result || !result.rows) {
      console.error('Consulta retornou um valor inválido:', result);
      return res.status(500).json({ error: 'Erro ao buscar reservas.' });
    }

    console.log('Consulta ao banco realizada com sucesso:', result.rows);
    res.status(200).json(result.rows); // Retorna as linhas da query
  } catch (error) {
    console.error('Erro ao buscar reservas:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createReservation,
  getAllReservations,
};

