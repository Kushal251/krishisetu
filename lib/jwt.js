import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    SECRET,
    { expiresIn: "7d" }
  );
}
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET);
    return decoded.id;
  } catch (err) {
    return null;
  }
}
