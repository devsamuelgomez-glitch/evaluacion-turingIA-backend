import { db } from '../db/connection.js';
import { HttpError } from '../utils/HttpError.js';
import { toPublicUrl } from '../utils/publicUrl.js';

const SELECT_REVIEW = `
  SELECT r.id, r.rating, r.comment, r.created_at,
         u.id AS user_id, u.name AS user_name,
         p.id AS product_id, p.name AS product_name, p.image_url AS product_image
  FROM reviews r
  JOIN users u ON u.id = r.user_id
  JOIN products p ON p.id = r.product_id
`;

const findLatest = db.prepare(`${SELECT_REVIEW} ORDER BY r.created_at DESC, r.id DESC LIMIT ?`);
const findByProduct = db.prepare(`${SELECT_REVIEW} WHERE r.product_id = ? ORDER BY r.created_at DESC, r.id DESC`);
const findById = db.prepare(`${SELECT_REVIEW} WHERE r.id = ?`);
const productExists = db.prepare('SELECT 1 FROM products WHERE id = ?');
const alreadyReviewed = db.prepare('SELECT 1 FROM reviews WHERE product_id = ? AND user_id = ?');
const insertReview = db.prepare('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)');
const deleteReview = db.prepare('DELETE FROM reviews WHERE id = ?');

function toDto(row) {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    created_at: row.created_at,
    user: { id: row.user_id, name: row.user_name },
    product: { id: row.product_id, name: row.product_name, image_url: toPublicUrl(row.product_image) },
  };
}

function assertProduct(productId) {
  if (!productExists.get(productId)) throw HttpError.notFound(`Producto ${productId} no encontrado`);
}

export const listLatest = (limit) => findLatest.all(limit).map(toDto);

export function listByProduct(productId) {
  assertProduct(productId);
  return findByProduct.all(productId).map(toDto);
}

export function create(productId, userId, { rating, comment }) {
  assertProduct(productId);
  if (alreadyReviewed.get(productId, userId)) {
    throw HttpError.conflict('Ya dejaste una reseña para este producto');
  }
  const { lastInsertRowid } = insertReview.run(productId, userId, rating, comment);
  return toDto(findById.get(lastInsertRowid));
}

/** Only the author or an admin may delete a review. */
export function remove(id, user) {
  const review = findById.get(id);
  if (!review) throw HttpError.notFound(`Reseña ${id} no encontrada`);
  if (review.user_id !== user.sub && user.role !== 'admin') {
    throw HttpError.forbidden('Solo el autor o un administrador pueden eliminar esta reseña');
  }
  deleteReview.run(id);
}
