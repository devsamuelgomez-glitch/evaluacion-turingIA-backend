import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, ANA, USER, api, bearer, tokenFor, validProduct } from '../helpers.js';

let admin;
let user;
let ana;
before(async () => {
  [admin, user, ana] = await Promise.all([tokenFor(ADMIN), tokenFor(USER), tokenFor(ANA)]);
});

describe('GET /api/reviews', () => {
  it('últimas 3 reseñas por defecto, con usuario y producto', async () => {
    const res = await api().get('/api/reviews').set(bearer(user)).expect(200);
    assert.equal(res.body.length, 3);
    const [first] = res.body;
    assert.ok(first.user.name && first.product.name);
    assert.match(first.product.image_url, /^http:\/\/api\.test\/images\//);
    assert.equal(first.user.email, undefined, 'no expone el correo de otros usuarios');
  });

  it('respeta limit y lo valida', async () => {
    const res = await api().get('/api/reviews?limit=5').set(bearer(user)).expect(200);
    assert.equal(res.body.length, 5);
    await api().get('/api/reviews?limit=0').set(bearer(user)).expect(400);
  });
});

describe('Reseñas de un producto', () => {
  let reviewId;

  it('POST crea la reseña (201) y aparece primero en las últimas', async () => {
    const res = await api().post('/api/products/13/reviews').set(bearer(user)).send({ rating: 5, comment: 'Excelente tablet' }).expect(201);
    reviewId = res.body.id;
    assert.equal(res.body.user.name, 'Usuario Demo');
    const latest = await api().get('/api/reviews?limit=1').set(bearer(user)).expect(200);
    assert.equal(latest.body[0].id, reviewId);
  });

  it('409 si el mismo usuario reseña el mismo producto', async () => {
    const res = await api().post('/api/products/13/reviews').set(bearer(user)).send({ rating: 4, comment: 'Otra vez' }).expect(409);
    assert.equal(res.body.error, 'Ya dejaste una reseña para este producto');
  });

  it('GET lista las reseñas del producto; 404 si no existe', async () => {
    const res = await api().get('/api/products/13/reviews').set(bearer(user)).expect(200);
    assert.ok(res.body.some((r) => r.id === reviewId));
    await api().get('/api/products/9999/reviews').set(bearer(user)).expect(404);
  });

  it('400 con calificación fuera de rango y 404 con producto inexistente', async () => {
    await api().post('/api/products/13/reviews').set(bearer(ana)).send({ rating: 7, comment: 'Demasiado' }).expect(400);
    await api().post('/api/products/9999/reviews').set(bearer(ana)).send({ rating: 4, comment: 'No existe' }).expect(404);
  });

  it('DELETE: otro usuario recibe 403, el autor puede borrarla', async () => {
    await api().delete(`/api/reviews/${reviewId}`).set(bearer(ana)).expect(403);
    await api().delete(`/api/reviews/${reviewId}`).set(bearer(user)).expect(204);
    await api().delete(`/api/reviews/${reviewId}`).set(bearer(user)).expect(404);
  });

  it('DELETE: un admin puede borrar cualquier reseña', async () => {
    const res = await api().post('/api/products/14/reviews').set(bearer(ana)).send({ rating: 3, comment: 'Está bien' }).expect(201);
    await api().delete(`/api/reviews/${res.body.id}`).set(bearer(admin)).expect(204);
  });

  it('al eliminar un producto se eliminan sus reseñas (ON DELETE CASCADE)', async () => {
    const product = await api().post('/api/products').set(bearer(admin)).send(validProduct({ name: 'Con reseñas' })).expect(201);
    await api().post(`/api/products/${product.body.id}/reviews`).set(bearer(user)).send({ rating: 5, comment: 'Lo recomiendo' }).expect(201);
    await api().delete(`/api/products/${product.body.id}`).set(bearer(admin)).expect(204);
    const latest = await api().get('/api/reviews?limit=20').set(bearer(user)).expect(200);
    assert.ok(latest.body.every((r) => r.product.id !== product.body.id));
  });
});
