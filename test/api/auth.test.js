import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, USER, api, bearer, tokenFor } from '../helpers.js';

describe('POST /api/auth/login', () => {
  it('devuelve usuario (sin password_hash) y un JWT con su rol', async () => {
    const res = await api().post('/api/auth/login').send(ADMIN).expect(200);
    assert.equal(res.body.user.role, 'admin');
    assert.equal(res.body.user.password_hash, undefined);
    const payload = JSON.parse(Buffer.from(res.body.token.split('.')[1], 'base64url'));
    assert.equal(payload.role, 'admin');
    assert.ok(payload.exp > payload.iat);
  });

  it('acepta el correo con mayúsculas y espacios', async () => {
    await api().post('/api/auth/login').send({ email: '  USER@techstore.com ', password: USER.password }).expect(200);
  });

  it('mismo mensaje para contraseña incorrecta y correo inexistente', async () => {
    const wrongPassword = await api().post('/api/auth/login').send({ ...ADMIN, password: 'Incorrecta1' }).expect(401);
    const unknownEmail = await api().post('/api/auth/login').send({ email: 'nadie@techstore.com', password: 'Algo1234' }).expect(401);
    assert.equal(wrongPassword.body.error, 'Credenciales incorrectas');
    assert.equal(unknownEmail.body.error, wrongPassword.body.error);
  });

  it('400 con detalle si faltan campos', async () => {
    const res = await api().post('/api/auth/login').send({}).expect(400);
    assert.deepEqual(res.body.details.map((d) => d.field).sort(), ['email', 'password']);
  });
});

describe('POST /api/auth/register', () => {
  const newUser = { name: 'Nueva Persona', email: 'nueva@techstore.com', password: 'Password1' };

  it('crea la cuenta siempre con rol user (no se puede elegir admin)', async () => {
    const res = await api().post('/api/auth/register').send({ ...newUser, role: 'admin' }).expect(201);
    assert.equal(res.body.user.role, 'user');
    assert.ok(res.body.token);
  });

  it('409 si el correo ya existe', async () => {
    const res = await api().post('/api/auth/register').send({ ...newUser, email: 'NUEVA@techstore.com' }).expect(409);
    assert.equal(res.body.error, 'El correo ya está registrado');
  });

  it('400 con contraseña débil', async () => {
    await api().post('/api/auth/register').send({ ...newUser, email: 'otra@techstore.com', password: 'debil' }).expect(400);
  });
});

describe('GET /api/auth/me', () => {
  let token;
  before(async () => { token = await tokenFor(USER); });

  it('devuelve el perfil del token', async () => {
    const res = await api().get('/api/auth/me').set(bearer(token)).expect(200);
    assert.equal(res.body.email, USER.email);
    assert.equal(res.body.role, 'user');
  });

  it('401 sin token', async () => {
    await api().get('/api/auth/me').expect(401);
  });
});
