import bcrypt from 'bcryptjs';
import { db, transaction } from './connection.js';

const categories = [
  { name: 'Laptops', slug: 'laptops' },
  { name: 'Smartphones', slug: 'smartphones' },
  { name: 'Tablets', slug: 'tablets' },
  { name: 'Audio', slug: 'audio' },
  { name: 'Accesorios', slug: 'accesorios' },
];

const brands = ['Apple', 'Samsung', 'Lenovo', 'Dell', 'Asus', 'Huawei', 'Oppo', 'Realme', 'Vivo', 'Amazon', 'Beats'];

// Product photos from the DummyJSON demo catalog (https://dummyjson.com/docs/products),
// stored locally in public/images/products and served by the API at /images
const IMAGE_DIR = '/images/products';

// [name, description, price, stock, category slug, brand, image (category/file name, without .webp)]
const products = [
  ['MacBook Pro 14"', 'Pantalla Liquid Retina XDR, chip Apple Silicon y hasta 18 h de batería.', 42999, 6, 'laptops', 'Apple', 'laptops/apple-macbook-pro-14-inch-space-grey'],
  ['Asus Zenbook Pro Duo', 'Laptop con doble pantalla táctil OLED para creadores de contenido.', 38999, 4, 'laptops', 'Asus', 'laptops/asus-zenbook-pro-dual-screen-laptop'],
  ['Huawei MateBook X Pro', 'Pantalla 3K FullView táctil y cuerpo de aluminio de 1.3 kg.', 29999, 8, 'laptops', 'Huawei', 'laptops/huawei-matebook-x-pro'],
  ['Dell XPS 13 9300', 'Diseño InfinityEdge, Intel Core i7 y chasis de aluminio.', 27999, 7, 'laptops', 'Dell', 'laptops/new-dell-xps-13-9300-laptop'],
  ['Lenovo Yoga 920', 'Convertible 2 en 1 con bisagra de 360° y lápiz digital.', 21999, 10, 'laptops', 'Lenovo', 'laptops/lenovo-yoga-920'],
  ['iPhone 13 Pro', 'Sistema de triple cámara Pro, pantalla ProMotion de 120 Hz y chip A15.', 19999, 15, 'smartphones', 'Apple', 'smartphones/iphone-13-pro-full'],
  ['iPhone X', 'Pantalla Super Retina OLED de 5.8" y Face ID.', 8999, 12, 'smartphones', 'Apple', 'smartphones/iphone-x'],
  ['Samsung Galaxy S10', 'Pantalla Dynamic AMOLED, triple cámara y carga inalámbrica reversible.', 9999, 18, 'smartphones', 'Samsung', 'smartphones/samsung-galaxy-s10-full'],
  ['Samsung Galaxy S8', 'Pantalla Infinity curva de 5.8" y resistencia al agua IP68.', 5499, 9, 'smartphones', 'Samsung', 'smartphones/samsung-galaxy-s8'],
  ['Oppo F19 Pro+', 'Carga rápida de 50 W y cuádruple cámara de 48 MP.', 6999, 20, 'smartphones', 'Oppo', 'smartphones/oppo-f19-pro-plus'],
  ['Realme XT', 'Cámara de 64 MP y pantalla Super AMOLED de 6.4".', 5999, 22, 'smartphones', 'Realme', 'smartphones/realme-xt'],
  ['Vivo X21', 'Lector de huellas en pantalla y cámara dual con IA.', 6499, 11, 'smartphones', 'Vivo', 'smartphones/vivo-x21-full'],
  ['iPad mini 2021', 'Pantalla Liquid Retina de 8.3", chip A15 y USB-C.', 12999, 14, 'tablets', 'Apple', 'tablets/ipad-mini-2021-starlight'],
  ['Samsung Galaxy Tab S8+', 'Pantalla Super AMOLED de 12.4" y S Pen incluido.', 17999, 8, 'tablets', 'Samsung', 'tablets/samsung-galaxy-tab-s8-plus-grey'],
  ['Samsung Galaxy Tab', 'Tablet ligera para entretenimiento, lectura y videollamadas.', 4999, 25, 'tablets', 'Samsung', 'tablets/samsung-galaxy-tab-white'],
  ['AirPods', 'Audífonos inalámbricos con conexión instantánea a tus dispositivos Apple.', 2999, 40, 'audio', 'Apple', 'mobile-accessories/apple-airpods'],
  ['AirPods Max', 'Audífonos over-ear con cancelación activa de ruido y audio espacial.', 11999, 6, 'audio', 'Apple', 'mobile-accessories/apple-airpods-max-silver'],
  ['Beats Flex', 'Audífonos inalámbricos con hasta 12 h de batería y chip Apple W1.', 1499, 30, 'audio', 'Beats', 'mobile-accessories/beats-flex-wireless-earphones'],
  ['Amazon Echo Plus', 'Bocina inteligente con Alexa y hub de hogar integrado.', 2499, 16, 'audio', 'Amazon', 'mobile-accessories/amazon-echo-plus'],
  ['HomePod mini', 'Bocina inteligente con sonido de 360° y Siri.', 2299, 19, 'audio', 'Apple', 'mobile-accessories/apple-homepod-mini-cosmic-grey'],
  ['Apple Watch Series 4', 'Reloj inteligente con electrocardiograma y detección de caídas.', 5999, 10, 'accesorios', 'Apple', 'mobile-accessories/apple-watch-series-4-gold'],
  ['Batería MagSafe', 'Batería externa magnética para iPhone con carga inalámbrica.', 1999, 24, 'accesorios', 'Apple', 'mobile-accessories/apple-magsafe-battery-pack'],
  ['Cargador para iPhone', 'Cargador USB-C de carga rápida para iPhone y AirPods.', 499, 50, 'accesorios', 'Apple', 'mobile-accessories/apple-iphone-charger'],
  ['Funda de silicona iPhone 12', 'Funda con MagSafe, interior de microfibra y acabado suave.', 899, 35, 'accesorios', 'Apple', 'mobile-accessories/iphone-12-silicone-case-with-magsafe-plum'],
];

const reviews = [
  // [product name, user email, rating, comment]
  ['MacBook Pro 14"', 'user@techstore.com', 5, 'Silenciosa, rápida y la batería dura todo el día.'],
  ['AirPods Max', 'user@techstore.com', 5, 'La cancelación de ruido es impresionante.'],
  ['Samsung Galaxy S10', 'ana@techstore.com', 4, 'Excelente cámara, aunque la batería podría durar más.'],
  ['Apple Watch Series 4', 'ana@techstore.com', 5, 'Ideal para entrenar y ver notificaciones.'],
  ['iPhone 13 Pro', 'luis@techstore.com', 4, 'Muy fluido y las fotos nocturnas son geniales.'],
];

transaction(() => {
  db.exec('DELETE FROM reviews; DELETE FROM products; DELETE FROM users; DELETE FROM brands; DELETE FROM categories; DELETE FROM roles;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('reviews','products','users','brands','categories','roles');");

  const insertRole = db.prepare('INSERT INTO roles (name) VALUES (?)');
  const roleIds = {
    admin: insertRole.run('admin').lastInsertRowid,
    user: insertRole.run('user').lastInsertRowid,
  };

  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)');
  const users = [
    ['Administrador', 'admin@techstore.com', 'Admin123!', 'admin'],
    ['Usuario Demo', 'user@techstore.com', 'User123!', 'user'],
    ['Ana Torres', 'ana@techstore.com', 'User123!', 'user'],
    ['Luis Pérez', 'luis@techstore.com', 'User123!', 'user'],
  ];
  const userIds = {};
  for (const [name, email, password, role] of users) {
    userIds[email] = insertUser.run(name, email, bcrypt.hashSync(password, 10), roleIds[role]).lastInsertRowid;
  }

  const insertCategory = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
  const categoryIds = {};
  for (const { name, slug } of categories) {
    categoryIds[slug] = insertCategory.run(name, slug).lastInsertRowid;
  }

  const insertBrand = db.prepare('INSERT INTO brands (name) VALUES (?)');
  const brandIds = {};
  for (const name of brands) {
    brandIds[name] = insertBrand.run(name).lastInsertRowid;
  }

  const insertProduct = db.prepare(
    'INSERT INTO products (name, description, price, stock, image_url, category_id, brand_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const productIds = {};
  for (const [name, description, price, stock, category, brand, image] of products) {
    productIds[name] = insertProduct.run(
      name, description, price, stock, `${IMAGE_DIR}/${image.split('/').pop()}.webp`, categoryIds[category], brandIds[brand]
    ).lastInsertRowid;
  }

  const insertReview = db.prepare('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)');
  for (const [product, email, rating, comment] of reviews) {
    insertReview.run(productIds[product], userIds[email], rating, comment);
  }
});

console.log(`Seed completado: ${products.length} productos, ${categories.length} categorías, ${brands.length} marcas.`);
console.log('Credenciales: admin@techstore.com / Admin123!  ·  user@techstore.com / User123!');
