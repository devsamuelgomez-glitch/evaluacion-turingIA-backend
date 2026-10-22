import { db } from '../db/connection.js';
import { HttpError } from '../utils/HttpError.js';
import { toPublicUrl } from '../utils/publicUrl.js';

const SELECT_PRODUCT = `
  SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url,
         p.created_at, p.updated_at,
         c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
         b.id AS brand_id, b.name AS brand_name,
         ROUND(AVG(rv.rating), 1) AS rating, COUNT(rv.id) AS review_count
  FROM products p
  JOIN categories c ON c.id = p.category_id
  JOIN brands b ON b.id = p.brand_id
  LEFT JOIN reviews rv ON rv.product_id = p.id
`;

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  name: 'p.name COLLATE NOCASE ASC',
};

const findById = db.prepare(`${SELECT_PRODUCT} WHERE p.id = ? GROUP BY p.id`);
const categoryExists = db.prepare('SELECT 1 FROM categories WHERE id = ?');
const brandExists = db.prepare('SELECT 1 FROM brands WHERE id = ?');

function toDto(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    stock: row.stock,
    image_url: toPublicUrl(row.image_url),
    rating: row.rating,
    review_count: row.review_count,
    category: { id: row.category_id, name: row.category_name, slug: row.category_slug },
    brand: { id: row.brand_id, name: row.brand_name },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function assertRelations({ category_id, brand_id }) {
  if (!categoryExists.get(category_id)) throw HttpError.badRequest(`La categoría ${category_id} no existe`);
  if (!brandExists.get(brand_id)) throw HttpError.badRequest(`La marca ${brand_id} no existe`);
}

export function list({ category, brand, search, sort, page, limit }) {
  const where = [];
  const params = [];
  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (brand) { where.push('b.id = ?'); params.push(brand); }
  if (search) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { total } = db.prepare(`
    SELECT COUNT(*) AS total FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN brands b ON b.id = p.brand_id
    ${whereSql}
  `).get(...params);

  const rows = db.prepare(`
    ${SELECT_PRODUCT} ${whereSql}
    GROUP BY p.id ORDER BY ${SORTS[sort]} LIMIT ? OFFSET ?
  `).all(...params, limit, (page - 1) * limit);

  return {
    data: rows.map(toDto),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export function getById(id) {
  const row = findById.get(id);
  if (!row) throw HttpError.notFound(`Producto ${id} no encontrado`);
  return toDto(row);
}

export function create(data) {
  assertRelations(data);
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO products (name, description, price, stock, image_url, category_id, brand_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.name, data.description, data.price, data.stock, data.image_url ?? null, data.category_id, data.brand_id);
  return getById(lastInsertRowid);
}

export function update(id, data) {
  getById(id);
  assertRelations(data);
  db.prepare(`
    UPDATE products
    SET name = ?, description = ?, price = ?, stock = ?, image_url = ?,
        category_id = ?, brand_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(data.name, data.description, data.price, data.stock, data.image_url ?? null, data.category_id, data.brand_id, id);
  return getById(id);
}

export function remove(id) {
  const { changes } = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  if (!changes) throw HttpError.notFound(`Producto ${id} no encontrado`);
}
