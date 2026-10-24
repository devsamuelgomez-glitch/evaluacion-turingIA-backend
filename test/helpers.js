import { dbPath } from './setup.js';
import { rmSync } from 'node:fs';
import request from 'supertest';

// Seed the test database with the same demo data as `npm run seed` (quietly)
const log = console.log;
console.log = () => {};
await import('../src/db/seed.js');
console.log = log;

// Close the connection before deleting the file (Windows can't delete an open file)
const { db } = await import('../src/db/connection.js');
process.on('exit', () => {
  db.close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(dbPath + suffix, { force: true });
});

export const { default: app } = await import('../src/app.js');

export const api = () => request(app);

export const ADMIN = { email: 'admin@techstore.com', password: 'Admin123!' };
export const USER = { email: 'user@techstore.com', password: 'User123!' };
export const ANA = { email: 'ana@techstore.com', password: 'User123!' };

export async function tokenFor(credentials) {
  const res = await api().post('/api/auth/login').send(credentials);
  if (res.status !== 200) throw new Error(`login failed (${res.status}) for ${credentials.email}`);
  return res.body.token;
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });

export const validProduct = (overrides = {}) => ({
  name: 'Producto de prueba',
  description: 'Creado por las pruebas automatizadas.',
  price: 1999,
  stock: 5,
  image_url: '/images/products/iphone-x.webp',
  category_id: 1,
  brand_id: 1,
  ...overrides,
});
