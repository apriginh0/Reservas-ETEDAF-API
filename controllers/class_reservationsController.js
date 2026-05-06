const db = require('../config/dbTurso');
const { hasTimeConflict, normalizeReservationTimes } = require('../utils/reservationUtils');

async function getAuthenticatedUserRole(userId) {
  const userRoleResult = await db.execute({
    sql: 'SELECT role FROM users WHERE id = ?',
    args: [userId],
  });

  return userRoleResult.rows[0]?.role || null;
}

async function getReservationById(id) {
  const result = await db.execute({
    sql: `
      SELECT id, classId, date, time, teacherId, subject, classYear, objective, createdAt
      FROM class_reservations
      WHERE id = ?
    `,
    args: [id],
  });

  return result.rows[0] || null;
}

const createReservation = async (req, res) => {
  const { classId, date, time, subject, classYear, objective, createdAt } = req.body;

  try {
    const teacherId = req.user.id;
    const userRole = await getAuthenticatedUserRole(teacherId);

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Somente professores podem criar reservas.' });
    }

    if (!classId || !date || !time || !subject || !classYear || !objective) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const requestedTimes = normalizeReservationTimes(time);
    if (!requestedTimes.length) {
      return res.status(400).json({ error: 'Selecione ao menos um horário válido.' });
    }

    const existingReservationsResult = await db.execute({
      sql: `
        SELECT id, time
        FROM class_reservations
        WHERE classId = ? AND date = ?
      `,
      args: [classId, date],
    });

    const conflictingReservation = existingReservationsResult.rows.find((reservation) =>
      hasTimeConflict(reservation.time, requestedTimes)
    );

    if (conflictingReservation) {
      return res.status(409).json({ error: 'Já existe reserva para um ou mais horários selecionados.' });
    }

    const result = await db.execute({
      sql: `
        INSERT INTO class_reservations (classId, date, time, teacherId, subject, classYear, objective, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [classId, date, requestedTimes.join(', '), teacherId, subject, classYear, objective, createdAt],
    });

    if (!result.rowsAffected) {
      return res.status(500).json({ error: 'Erro ao criar a reserva.' });
    }

    return res.status(201).json({ message: 'Reserva criada com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar reserva.' });
  }
};

const getAllReservations = async (req, res) => {
  try {
    const { date, classId } = req.query;
    const filters = [];
    const args = [];

    if (date) {
      filters.push('date = ?');
      args.push(date);
    }

    if (classId) {
      filters.push('classId = ?');
      args.push(Number(classId));
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.execute({
      sql: `
        SELECT id, classId, date, time, teacherId, subject, classYear, objective, createdAt
        FROM class_reservations
        ${whereClause}
        ORDER BY date ASC, classId ASC, time ASC
      `,
      args,
    });

    return res.status(200).json(result.rows || []);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar reservas.' });
  }
};

const updateReservation = async (req, res) => {
  const id = Number(req.params.id);
  const { time } = req.body;

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido.' });
  }

  const normalizedTimes = normalizeReservationTimes(time);
  if (!normalizedTimes.length) {
    return res.status(400).json({ message: 'Horário inválido.' });
  }

  try {
    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reserva não encontrada.' });
    }

    const isOwner = reservation.teacherId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Você não pode editar esta reserva.' });
    }

    const updateResult = await db.execute({
      sql: 'UPDATE class_reservations SET time = ? WHERE id = ?',
      args: [normalizedTimes.join(', '), id],
    });

    if (!updateResult.rowsAffected) {
      return res.status(500).json({ message: 'Erro ao atualizar reserva.' });
    }

    return res.status(200).json({ message: 'Reserva atualizada com sucesso!' });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar reserva.' });
  }
};

const deleteReservation = async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido.' });
  }

  try {
    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reserva não encontrada.' });
    }

    const isOwner = reservation.teacherId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Você não pode excluir esta reserva.' });
    }

    const deleteResult = await db.execute({
      sql: 'DELETE FROM class_reservations WHERE id = ?',
      args: [id],
    });

    if (!deleteResult.rowsAffected) {
      return res.status(500).json({ message: 'Erro ao excluir reserva.' });
    }

    return res.status(200).json({ message: 'Reserva excluída com sucesso!' });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao excluir reserva.' });
  }
};

module.exports = {
  createReservation,
  deleteReservation,
  getAllReservations,
  updateReservation,
};
