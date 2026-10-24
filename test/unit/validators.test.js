import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema, registerSchema } from '../../src/validators/auth.validators.js';
import { productQuerySchema, productSchema } from '../../src/validators/product.validators.js';
import { reviewQuerySchema, reviewSchema } from '../../src/validators/review.validators.js';

const messages = (result) => result.error.issues.map((i) => i.message);

describe('registerSchema', () => {
  it('normaliza el correo (trim + minúsculas)', () => {
    const data = registerSchema.parse({ name: 'Ana', email: '  ANA@Mail.com ', password: 'Password1' });
    assert.equal(data.email, 'ana@mail.com');
  });

  it('exige contraseña de 8+ caracteres con mayúscula y número', () => {
    const result = registerSchema.safeParse({ name: 'Ana', email: 'ana@mail.com', password: 'corta' });
    assert.equal(result.success, false);
    assert.deepEqual(messages(result), [
      'La contraseña debe tener al menos 8 caracteres',
      'La contraseña debe incluir una mayúscula',
      'La contraseña debe incluir un número',
    ]);
  });

  it('rechaza correos inválidos y nombres muy cortos', () => {
    const result = registerSchema.safeParse({ name: 'A', email: 'no-es-correo', password: 'Password1' });
    assert.deepEqual(result.error.issues.map((i) => i.path[0]).sort(), ['email', 'name']);
  });
});

describe('loginSchema', () => {
  it('requiere contraseña', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
    assert.deepEqual(messages(result), ['La contraseña es obligatoria']);
  });
});

describe('productSchema', () => {
  const base = { name: 'Laptop', price: 100, stock: 1, category_id: 1, brand_id: 1 };

  it('acepta un producto mínimo y pone descripción vacía por defecto', () => {
    assert.equal(productSchema.parse(base).description, '');
  });

  it('acepta URL externa o ruta local /images/...', () => {
    assert.ok(productSchema.safeParse({ ...base, image_url: 'https://cdn.example.com/a.png' }).success);
    assert.ok(productSchema.safeParse({ ...base, image_url: '/images/products/a.webp' }).success);
  });

  it('rechaza rutas locales con path traversal o extensiones no permitidas', () => {
    assert.equal(productSchema.safeParse({ ...base, image_url: '/images/../.env' }).success, false);
    assert.equal(productSchema.safeParse({ ...base, image_url: '/images/a.svg' }).success, false);
  });

  it('rechaza precio/stock negativos y stock decimal', () => {
    const result = productSchema.safeParse({ ...base, price: -1, stock: 1.5 });
    assert.deepEqual(result.error.issues.map((i) => i.path[0]).sort(), ['price', 'stock']);
  });

  it('no convierte strings en números (el body debe venir tipado)', () => {
    assert.equal(productSchema.safeParse({ ...base, price: '100' }).success, false);
  });
});

describe('productQuerySchema', () => {
  it('aplica valores por defecto', () => {
    assert.deepEqual(productQuerySchema.parse({}), { sort: 'newest', page: 1, limit: 6 });
  });

  it('convierte los query params y limita limit a 50', () => {
    assert.deepEqual(productQuerySchema.parse({ page: '2', limit: '10' }), { sort: 'newest', page: 2, limit: 10 });
    assert.equal(productQuerySchema.safeParse({ limit: '51' }).success, false);
  });

  it('solo acepta ordenamientos conocidos (evita inyección en ORDER BY)', () => {
    assert.equal(productQuerySchema.safeParse({ sort: 'price; DROP TABLE products' }).success, false);
  });
});

describe('reviewSchema / reviewQuerySchema', () => {
  it('calificación entera de 1 a 5', () => {
    assert.ok(reviewSchema.safeParse({ rating: 5, comment: 'Muy bueno' }).success);
    assert.deepEqual(messages(reviewSchema.safeParse({ rating: 6, comment: 'Muy bueno' })), ['Máximo 5 estrellas']);
    assert.equal(reviewSchema.safeParse({ rating: 4.5, comment: 'Muy bueno' }).success, false);
  });

  it('comentario de 3 a 500 caracteres (sin contar espacios de los extremos)', () => {
    assert.equal(reviewSchema.safeParse({ rating: 3, comment: '  ok  ' }).success, false);
    assert.equal(reviewSchema.safeParse({ rating: 3, comment: 'x'.repeat(501) }).success, false);
  });

  it('limit de reseñas por defecto 3, máximo 20', () => {
    assert.equal(reviewQuerySchema.parse({}).limit, 3);
    assert.equal(reviewQuerySchema.safeParse({ limit: '21' }).success, false);
  });
});
