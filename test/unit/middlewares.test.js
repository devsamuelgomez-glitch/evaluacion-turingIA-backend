import '../setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const { authenticate, authorize } = await import('../../src/middlewares/auth.js');
const { validate } = await import('../../src/middlewares/validate.js');
const { HttpError } = await import('../../src/utils/HttpError.js');
const { toPublicUrl } = await import('../../src/utils/publicUrl.js');

// Runs a middleware and returns what it passed to next()
const run = (middleware, req) => {
  let result;
  middleware(req, {}, (err) => { result = err ?? 'next'; });
  return result;
};

describe('authenticate', () => {
  const secret = process.env.JWT_SECRET;

  it('acepta un Bearer válido y deja el payload en req.user', () => {
    const req = { headers: { authorization: `Bearer ${jwt.sign({ sub: 7, role: 'user' }, secret)}` } };
    assert.equal(run(authenticate, req), 'next');
    assert.equal(req.user.sub, 7);
  });

  it('401 sin header o con otro esquema', () => {
    for (const authorization of [undefined, 'Basic abc', 'Bearer']) {
      const err = run(authenticate, { headers: { authorization } });
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 401);
    }
  });

  it('401 con firma incorrecta o token vencido', () => {
    const forged = jwt.sign({ sub: 1, role: 'admin' }, 'otro-secreto');
    const expired = jwt.sign({ sub: 1, role: 'admin', exp: Math.floor(Date.now() / 1000) - 10 }, secret);
    for (const token of [forged, expired, 'basura']) {
      const err = run(authenticate, { headers: { authorization: `Bearer ${token}` } });
      assert.equal(err.status, 401);
      assert.equal(err.message, 'Token inválido o expirado');
    }
  });
});

describe('authorize', () => {
  it('deja pasar a los roles permitidos', () => {
    assert.equal(run(authorize('admin'), { user: { role: 'admin' } }), 'next');
    assert.equal(run(authorize('admin', 'user'), { user: { role: 'user' } }), 'next');
  });

  it('403 para otros roles o sin usuario', () => {
    assert.equal(run(authorize('admin'), { user: { role: 'user' } }).status, 403);
    assert.equal(run(authorize('admin'), {}).status, 403);
  });
});

describe('validate', () => {
  const schema = z.object({ page: z.coerce.number().int().min(1) });

  it('guarda los datos ya convertidos en req.validated[source]', () => {
    const req = { query: { page: '3' } };
    assert.equal(run(validate(schema, 'query'), req), 'next');
    assert.deepEqual(req.validated.query, { page: 3 });
  });

  it('400 con detalle por campo', () => {
    const err = run(validate(schema, 'query'), { query: { page: '0' } });
    assert.equal(err.status, 400);
    assert.equal(err.details[0].field, 'page');
  });
});

describe('toPublicUrl', () => {
  it('convierte rutas locales en URL absoluta con PUBLIC_URL', () => {
    assert.equal(toPublicUrl('/images/products/a.webp'), 'http://api.test/images/products/a.webp');
  });

  it('deja intactas las URLs externas y los valores vacíos', () => {
    assert.equal(toPublicUrl('https://cdn.example.com/a.png'), 'https://cdn.example.com/a.png');
    assert.equal(toPublicUrl(null), null);
  });
});
