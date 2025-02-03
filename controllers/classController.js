const db = require('../config/dbTurso'); // Configuração do banco de dados

const getClasses = async (req, res) => {
  try {
    const result = await db.execute(
      'SELECT id, name FROM classes'
    );

    if (!result || !result.rows) {
      console.error('Consulta retornou um valor inválido:', result);
      return res.status(500).json({ error: 'Erro ao buscar dados no banco' });
    }

    res.status(200).json(result.rows); // Retorna as linhas da query
  } catch (error) {
    console.error('Erro ao buscar salas:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getClasses = getClasses;
