const bcrypt = require('bcryptjs');

async function testPassword() {
  const plainPassword = '12345678'; // Senha que você digitou
  const hashedPassword = '$2a$10$N5U4sMA7ffIPAAX3bRqgx.ZYafeQ0VAoa0eQBDAv9N4Z8bT/ShOIO'; // Senha salva no banco

  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);

  if (isMatch) {
    console.log('Senha correta!');
  } else {
    console.log('Senha incorreta!');
  }
}

testPassword();
