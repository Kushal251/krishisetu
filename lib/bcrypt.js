import bcrypt from "bcryptjs";

// Hash password before saving to DB
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare login password with hashed password
export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}