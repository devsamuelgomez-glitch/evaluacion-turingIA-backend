import { db } from '../db/connection.js';
import { toPublicUrl } from '../utils/publicUrl.js';

// cover_image is derived (the category's most expensive product), not stored, to keep 3NF
const listCategories = db.prepare(`
  SELECT c.id, c.name, c.slug, COUNT(p.id) AS product_count,
         (SELECT image_url FROM products WHERE category_id = c.id ORDER BY price DESC LIMIT 1) AS cover_image
  FROM categories c LEFT JOIN products p ON p.category_id = c.id
  GROUP BY c.id ORDER BY c.name
`);

const listBrands = db.prepare(`
  SELECT b.id, b.name, b.logo_url, COUNT(p.id) AS product_count
  FROM brands b LEFT JOIN products p ON p.brand_id = b.id
  GROUP BY b.id ORDER BY b.name
`);

export const getCategories = () =>
  listCategories.all().map((c) => ({ ...c, cover_image: toPublicUrl(c.cover_image) }));

export const getBrands = () => listBrands.all();
