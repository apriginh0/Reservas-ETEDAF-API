const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Importa o modelo User
const db = require('../config/dbTurso'); // Conexão com o banco de dados
const nodemailer = require('nodemailer');
require('dotenv').config(); // Para acessar o JWT_SECRET do .env

// Login Controller
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  console.log('Iniciando login...');
  console.log('Dados recebidos:', { email, password });

  try {
    // Buscar usuário no banco de dados
    const query = 'SELECT * FROM users WHERE email = ?';
    const result = await db.execute({
      sql: query,
      args: [email]});
    const user = result.rows[0]; // Pegar a primeira linha do resultado

    console.log('Resultado da busca no banco de dados:', user);

    // Verificar se o usuário existe
    if (!user) {
      console.log('Usuário não encontrado.');
      return res.status(401).json({ message: 'Credenciais inválidas - usuário não encontrado' });
    }

    // Verificar se o usuário foi aprovado
    if (user.approved !== 1) {
      return res.status(401).json({ message: 'Cadastro pendente, aguardando autorização.' });
    }

    // Comparar senha usando bcrypt
    const isMatch = await User.comparePassword(password, user.password);
    console.log('Comparação de senha:', isMatch);

    if (!isMatch) {
      console.log('Senha incorreta.');
      return res.status(401).json({ message: 'Credenciais inválidas - senha incorreta' });
    }

    // Gerar token JWT
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });
    console.log('Token gerado com sucesso:', token);

    res.status(200).json({
      message: 'Login bem-sucedido!',
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Erro no login:', error.message);
    res.status(500).json({ message: 'Erro ao efetuar login', error: error.message });
  }
};

// Registro de usuário (exemplo simples)
const register = async (req, res) => {
   const { email, password } = req.body;

   console.log('Iniciando registro...');
   console.log('Dados recebidos:', { email, password });

   try {
     // Verificar se o usuário já existe no banco

     const userExists = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

     if (userExists.rows.length > 0) {
       console.log('Usuário já existe.');
       return res.status(400).json({ message: 'Usuário já existe' });
     }

     // Hash da senha usando bcrypt
     const hashedPassword = await User.hashPassword(password);

     // Inserir o novo usuário no banco
     await db.execute({
       sql: `INSERT INTO users (email, password, role, approved) VALUES (?, ?, ?, ?)`,
       args: [email, hashedPassword, 'teacher', 0], // Definindo 'user' como role padrão
     });

     console.log('Usuário registrado com sucesso. Aguardando aprovação.');
     res.status(201).json({ message: 'Usuário registrado com sucesso' });
   } catch (error) {
     console.error('Erro ao registrar usuário:', error.message);
     res.status(500).json({ message: 'Erro ao registrar usuário', error: error.message });
   }
 };

 // Atualizar usuário (apenas para admin)
const updateUser = async (req, res) => {
   const { userId, approved, role } = req.body; // Dados recebidos
   const adminId = req.user.id; // Usuário autenticado (deve ser admin)

   try {
     // Buscar o usuário autenticado no banco
     const adminQuery = 'SELECT role FROM users WHERE id = ?';
     const adminResult = await db.execute({ sql: adminQuery, args: [adminId] });

     if (adminResult.rows[0]?.role !== 'admin') {
       return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
     }

     // Atualizar o usuário especificado
     const updateQuery = 'UPDATE users SET approved = ?, role = ? WHERE id = ?';
     await db.execute({ sql: updateQuery, args: [approved, role, userId] });

     res.status(200).json({ message: 'Usuário atualizado com sucesso.' });
   } catch (error) {
     res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
   }
 };

// Enviar e-mail de redefinição de senha
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Verificar se o e-mail existe no banco de dados
    const query = 'SELECT * FROM users WHERE email = ?';
    const result = await db.execute({ sql: query, args: [email] });
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Adicione um e-mail válido.' });
    }

    // Gerar token de redefinição de senha
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Configurar transporte de e-mail
    const transporter = nodemailer.createTransport({
      host: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Configure no .env
        pass: process.env.EMAIL_PASS, // Configure no .env
      },
    });

    // Enviar e-mail de redefinição de senha
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Redefinição de senha',
      text: `Clique no link para redefinir sua senha: ${resetLink}`,
    });

    res.status(200).json({ message: 'E-mail de redefinição de senha enviado com sucesso.' });
  } catch (error) {
    console.error('Erro ao enviar e-mail de redefinição:', error);
    res.status(500).json({ message: 'Erro ao processar a solicitação.' });
  }
};

 // Exportar todas as funções
 exports.loginUser = loginUser;
 exports.register = register;
 exports.updateUser = updateUser;
 exports.forgotPassword = forgotPassword;



