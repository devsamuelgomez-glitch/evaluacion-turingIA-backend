import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { USER, api, bearer } from '../helpers.js';

describe('Acceso sin sesión', () => {
  it('todos los endpoints de datos responden 401 sin token', async () => {
    const paths = ['/api/products', '/api/products/1', '/api/products/1/reviews', '/api/categories', '/api/brands', '/api/reviews', '/api/images'];
    for (const path of paths) {
      const res = await api().get(path);
      assert.equal(res.status, 401, path);
      assert.equal(res.body.error, 'Token no proporcionado');
    }
  });

  it('solo health, login, registro e imágenes estáticas son públicos', async () => {
    await api().get('/api/health').expect(200, { status: 'ok' });
    await api().get('/images/products/iphone-x.webp').expect(200).expect('Content-Type', 'image/webp');
  });

  it('rechaza tokens falsificados (firmados con otro secreto) y vencidos', async () => {
    const forged = jwt.sign({ sub: 1, role: 'admin', name: 'Hacker' }, 'adivinado');
    const expired = jwt.sign({ sub: 1, role: 'admin', exp: Math.floor(Date.now() / 1000) - 1 }, process.env.JWT_SECRET);
    await api().get('/api/products').set(bearer(forged)).expect(401);
    await api().get('/api/products').set(bearer(expired)).expect(401);
  });
});

describe('Cabeceras y errores', () => {
  it('helmet: cabeceras de seguridad y sin X-Powered-By', async () => {
    const res = await api().get('/api/health');
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-security-policy']);
  });

  it('CORS: permite el origen del frontend y no otros', async () => {
    const allowed = await api().get('/api/health').set('Origin', 'http://front.test');
    assert.equal(allowed.headers['access-control-allow-origin'], 'http://front.test');
    const denied = await api().get('/api/health').set('Origin', 'http://malicioso.test');
    assert.equal(denied.headers['access-control-allow-origin'], undefined);
  });

  it('400 con JSON mal formado y 413 con body de más de 100 kB', async () => {
    const bad = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":').expect(400);
    assert.equal(bad.body.error, 'JSON mal formado');
    const big = await api().post('/api/auth/login').send({ email: 'a@b.com', password: 'x'.repeat(110_000) }).expect(413);
    assert.equal(big.body.error, 'El cuerpo de la petición excede el límite de 100 kB');
  });

  it('404 en JSON para rutas inexistentes', async () => {
    const res = await api().get('/api/no-existe').expect(404);
    assert.equal(res.body.error, 'Ruta GET /api/no-existe no encontrada');
  });
});

describe('Rate limiting', () => {
  it('bloquea con 429 después de 20 intentos de login en 15 minutos', async () => {
    let last;
    for (let i = 0; i < 21; i++) {
      last = await api().post('/api/auth/login').send({ ...USER, password: 'Incorrecta1' });
    }
    assert.equal(last.status, 429);
    assert.equal(last.body.error, 'Demasiados intentos, intenta de nuevo en 15 minutos');
  });
});
