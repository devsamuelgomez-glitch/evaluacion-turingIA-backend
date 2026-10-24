import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, USER, api, bearer, tokenFor, validProduct } from '../helpers.js';

let admin;
let user;
before(async () => {
  [admin, user] = await Promise.all([tokenFor(ADMIN), tokenFor(USER)]);
});

describe('GET /api/products', () => {
  it('lista paginada con 6 por defecto e imágenes como URL absoluta', async () => {
    const res = await api().get('/api/products').set(bearer(user)).expect(200);
    assert.equal(res.body.data.length, 6);
    assert.deepEqual(res.body.pagination, { page: 1, limit: 6, total: 24, totalPages: 4 });
    assert.match(res.body.data[0].image_url, /^http:\/\/api\.test\/images\/products\/.+\.webp$/);
  });

  it('filtra por categoría y ordena por precio', async () => {
    const res = await api().get('/api/products?category=tablets&sort=price_asc&limit=50').set(bearer(user)).expect(200);
    const prices = res.body.data.map((p) => p.price);
    assert.equal(res.body.pagination.total, 3);
    assert.ok(res.body.data.every((p) => p.category.slug === 'tablets'));
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  });

  it('busca por nombre o descripción, sin distinguir mayúsculas', async () => {
    const res = await api().get('/api/products?search=airpods').set(bearer(user)).expect(200);
    // "Cargador para iPhone" matches through its description ("...para iPhone y AirPods")
    assert.deepEqual(res.body.data.map((p) => p.name).sort(), ['AirPods', 'AirPods Max', 'Cargador para iPhone']);
  });

  it('la búsqueda no permite inyección SQL', async () => {
    const res = await api().get(`/api/products?search=${encodeURIComponent("' OR 1=1 --")}`).set(bearer(user)).expect(200);
    assert.equal(res.body.pagination.total, 0);
  });

  it('400 con query params inválidos', async () => {
    await api().get('/api/products?limit=500').set(bearer(user)).expect(400);
    await api().get('/api/products?sort=hack').set(bearer(user)).expect(400);
  });

  it('incluye la calificación promedio calculada de las reseñas', async () => {
    const res = await api().get('/api/products?search=MacBook').set(bearer(user)).expect(200);
    assert.equal(res.body.data[0].rating, 5);
    assert.equal(res.body.data[0].review_count, 1);
  });
});

describe('GET /api/products/:id', () => {
  it('detalle de producto', async () => {
    const res = await api().get('/api/products/1').set(bearer(user)).expect(200);
    assert.equal(res.body.id, 1);
    assert.ok(res.body.category.name && res.body.brand.name);
  });

  it('404 si no existe y 400 si el id no es válido', async () => {
    await api().get('/api/products/9999').set(bearer(user)).expect(404);
    await api().get('/api/products/abc').set(bearer(user)).expect(400);
  });
});

describe('CRUD de productos (solo admin)', () => {
  let id;

  it('POST crea el producto (201)', async () => {
    const res = await api().post('/api/products').set(bearer(admin)).send(validProduct()).expect(201);
    id = res.body.id;
    assert.equal(res.body.name, 'Producto de prueba');
    assert.equal(res.body.image_url, 'http://api.test/images/products/iphone-x.webp');
  });

  it('PUT actualiza el producto', async () => {
    const res = await api().put(`/api/products/${id}`).set(bearer(admin)).send(validProduct({ price: 999, stock: 0 })).expect(200);
    assert.equal(res.body.price, 999);
    assert.equal(res.body.stock, 0);
    assert.ok(res.body.updated_at);
  });

  it('DELETE elimina el producto (204) y después da 404', async () => {
    await api().delete(`/api/products/${id}`).set(bearer(admin)).expect(204);
    await api().get(`/api/products/${id}`).set(bearer(user)).expect(404);
    await api().delete(`/api/products/${id}`).set(bearer(admin)).expect(404);
  });

  it('400 con detalle por campo cuando el body es inválido', async () => {
    const res = await api().post('/api/products').set(bearer(admin)).send({ name: 'x', price: -5 }).expect(400);
    const fields = res.body.details.map((d) => d.field);
    for (const field of ['name', 'price', 'stock', 'category_id', 'brand_id']) assert.ok(fields.includes(field), field);
  });

  it('400 si la categoría o la marca no existen', async () => {
    const res = await api().post('/api/products').set(bearer(admin)).send(validProduct({ category_id: 999 })).expect(400);
    assert.equal(res.body.error, 'La categoría 999 no existe');
  });

  it('403 para un user y 401 sin token', async () => {
    await api().post('/api/products').set(bearer(user)).send(validProduct()).expect(403);
    await api().put('/api/products/1').set(bearer(user)).send(validProduct()).expect(403);
    await api().delete('/api/products/1').set(bearer(user)).expect(403);
    await api().post('/api/products').send(validProduct()).expect(401);
  });
});

describe('Catálogo', () => {
  it('categorías con conteo y portada', async () => {
    const res = await api().get('/api/categories').set(bearer(user)).expect(200);
    assert.equal(res.body.length, 5);
    const total = res.body.reduce((sum, c) => sum + c.product_count, 0);
    assert.equal(total, 24);
    assert.ok(res.body.every((c) => c.cover_image.startsWith('http://api.test/images/')));
  });

  it('marcas con conteo', async () => {
    const res = await api().get('/api/brands').set(bearer(user)).expect(200);
    assert.equal(res.body.length, 11);
  });

  it('GET /images solo para admin', async () => {
    const res = await api().get('/api/images').set(bearer(admin)).expect(200);
    assert.equal(res.body.length, 24);
    assert.ok(res.body.every((img) => img.path.startsWith('/images/products/')));
    await api().get('/api/images').set(bearer(user)).expect(403);
  });
});
