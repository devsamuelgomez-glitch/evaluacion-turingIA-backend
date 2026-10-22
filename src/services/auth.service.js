import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';

const findByEmail = db.prepare(`
  SELECT u.id, u.name, u.email, u.password_hash, r.name AS role
  FROM users u JOIN roles r ON r.id = u.role_id
  WHERE u.email = ?
`);

const findById = db.prepare(`
  SELECT u.id, u.name, u.email, r.name AS role, u.created_at
  FROM users u JOIN roles r ON r.id = u.role_id
  WHERE u.id = ?
`);

const insertUser = db.prepare(`
  INSERT INTO users (name, email, password_hash, role_id)
  VALUES (?, ?, ?, (SELECT id FROM roles WHERE name = 'user'))
`);

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export async function register({ name, email, password }) {
  if (findByEmail.get(email)) {
    throw HttpError.conflict('El correo ya está registrado');
  }
  const hash = await bcrypt.hash(password, 10);
  const { lastInsertRowid } = insertUser.run(name, email, hash);
  const user = findById.get(lastInsertRowid);
  return { user, token: signToken(user) };
}

export async function login({ email, password }) {
  const row = findByEmail.get(email);
  // Same message for both cases so we don't reveal which emails exist
  const valid = row && (await bcrypt.compare(password, row.password_hash));
  if (!valid) {
    throw HttpError.unauthorized('Credenciales incorrectas');
  }
  const { password_hash: _, ...user } = row;
  return { user, token: signToken(user) };
}

export function getProfile(id) {
  const user = findById.get(id);
  if (!user) throw HttpError.notFound('Usuario no encontrado');
  return user;
}
