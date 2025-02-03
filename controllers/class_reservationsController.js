const db = require('../config/dbTurso'); // Configuração do banco de dados

// Criar uma nova reserva
const createReservation = async (req, res) => {

  const { classId, date, time, subject, classYear, objective, createdAt } = req.body;

  try {
    const teacherId = req.user.id;

    if (!teacherId) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

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
      INSERT INTO class_reservations (classId, date, time, teacherId, subject, classYear, objective, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [classId, date, time, teacherId, subject, classYear, objective, createdAt];

    const result = await db.execute({
      sql: query,
      args: params,
    });

    if (!result || !result.rowsAffected) {
      console.error('Erro ao inserir a reserva no banco:', result);
      return res.status(500).json({ error: 'Erro ao criar a reserva.' });
    }

    res.status(201).json({ message: 'Reserva criada com sucesso!' });
  } catch (error) {
    console.error('Erro ao criar reserva:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Buscar todas as reservas (opcional)
const getAllReservations = async (req, res) => {
  try {
    const query = 'SELECT * FROM class_reservations';
    const result = await db.execute(query);

    if (!result || !result.rows) {
      console.error('Consulta retornou um valor inválido:', result);
      return res.status(500).json({ error: 'Erro ao buscar reservas.' });
    }

    res.status(200).json(result.rows); // Retorna as linhas da query
  } catch (error) {
    console.error('Erro ao buscar reservas:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const updateReservation = async (req, res) => {
  const id = Number(req.params.id);
  const { time } = req.body; // Novo valor de time

  const updateQuery = 'UPDATE class_reservations SET time = ? WHERE id = ?';
  const updateResult = await db.execute({ sql: updateQuery, args: [time, id] });

  if (updateResult.rowsAffected === 0) {
    return res.status(500).json({ message: 'Erro ao atualizar reserva.' });
  }

  res.status(200).json({ message: 'Reserva atualizada com sucesso!' });
};


const deleteReservation = async (req, res) => {
  const id = Number(req.params.id); // Convertendo para número

  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido.' });
  }

  try {
    // Primeiro, verificamos se a reserva existe
    const checkQuery = 'SELECT * FROM class_reservations WHERE id = ?';
    const checkResult = await db.execute({
      sql: checkQuery,
      args: [id],
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva não encontrada.' });
    }

    // Excluir a reserva
    const deleteQuery = 'DELETE FROM class_reservations WHERE id = ?';
    const deleteResult = await db.execute({
      sql: deleteQuery,
      args: [id],
    });

    if (deleteResult.rowsAffected === 0) {
      return res.status(500).json({ message: 'Erro ao excluir reserva.' });
    }

    res.status(200).json({ message: 'Reserva excluída com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir reserva:', error);
    res.status(500).json({ message: 'Erro ao excluir reserva.', error: error.message });
  }
};


module.exports = {
  createReservation,
  getAllReservations,
  deleteReservation,
  updateReservation,
};

