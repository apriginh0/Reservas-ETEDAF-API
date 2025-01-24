const bcrypt = require('bcryptjs');

class User {
  constructor(id, email, password, role, approved, name, id_reservation_teacherId) {
    this.id = id;
    this.name = name;
    this.password = password;
    this.role = role; // 'admin' ou 'teacher'
    this.approved = approved;
    this.email = email;
    this.id_reservation_teacherId = id_reservation_teacherId;
  }

  // Método para criptografar senha
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // Método para comparar senha
  static async comparePassword(enteredPassword, hashedPassword) {
    console.log(hashedPassword);
    return await bcrypt.compare(enteredPassword, hashedPassword);
  }
}

module.exports = User;
