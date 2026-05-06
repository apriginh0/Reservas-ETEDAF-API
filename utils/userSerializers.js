function toSafeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    approved: user.approved,
  };
}

function toPublicTeacher(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
  };
}

module.exports = {
  toPublicTeacher,
  toSafeUser,
};
