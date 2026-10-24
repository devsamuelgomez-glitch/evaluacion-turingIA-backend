# TechStore API

API REST de la tienda de productos tecnológicos **TechStore**, desarrollada para el periodo de prueba de Desarrollo de Software de Turing IA.

**Stack:** Node.js · Express 5 · SQLite (`node:sqlite`) · JWT · bcrypt · Zod

Frontend: repositorio [`evaluacion-turingIA-frontend`](https://github.com/devsamuelgomez-glitch/evaluacion-turingIA-frontend).

## Requisitos

- **Node.js 22.13 o superior** (se usa el módulo nativo `node:sqlite`, disponible sin flags desde esa versión; no hay que instalar ningún servidor de base de datos)
- npm 10+

## Instalación y ejecución

```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
# edita .env y pon un JWT_SECRET largo y aleatorio
npm run seed                # crea data/techstore.db con datos de prueba
npm run dev                 # http://localhost:4000/api
```

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor con recarga automática (nodemon) |
| `npm start` | Servidor en modo producción |
| `npm run seed` | Reinicia la base de datos con datos de ejemplo |
| `npm test` | Pruebas unitarias y de integración |
| `npm run test:coverage` | Pruebas con reporte de cobertura |

## Pruebas

```bash
npm test
```

67 pruebas con el runner nativo de Node (`node:test`) y [supertest](https://github.com/ladjs/supertest). No hace falta tener el servidor corriendo ni un `.env`: cada archivo de pruebas crea su propia base de datos temporal con los datos del seed y la borra al terminar. Cobertura: ~99 % de líneas.

| Archivo | Qué cubre |
|---|---|
| `test/unit/validators.test.js` | Esquemas Zod: reglas de contraseña, normalización de correo, rutas de imagen seguras, `sort` solo con valores permitidos |
| `test/unit/middlewares.test.js` | `authenticate` (token válido, vencido, falsificado), `authorize`, `validate`, `toPublicUrl` |
| `test/api/auth.test.js` | Login, registro (siempre rol `user`), 409 por correo duplicado, `/auth/me` |
| `test/api/products.test.js` | Listado con filtros, búsqueda, orden y paginación; CRUD completo como admin; 400/401/403/404 |
| `test/api/reviews.test.js` | Crear, listar y borrar reseñas; 409 por duplicada, permisos de autor/admin, borrado en cascada |
| `test/api/security.test.js` | 401 en todos los endpoints de datos, tokens falsificados, helmet, CORS, JSON mal formado, límite de 100 kB, rate limiting (429) |

Las pruebas encontraron y ayudaron a corregir dos bugs: un correo con espacios (`" user@techstore.com "`) se rechazaba porque se validaba antes de recortarlo, y un body de más de 100 kB respondía 500 en lugar de 413.

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `4000` | Puerto del servidor |
| `PUBLIC_URL` | `http://localhost:4000` | URL pública de la API; se usa para armar las URLs de las imágenes |
| `NODE_ENV` | `development` | En `production` se ocultan los detalles de errores 500 |
| `JWT_SECRET` | (obligatoria) | Secreto para firmar los tokens |
| `JWT_EXPIRES_IN` | `2h` | Vigencia del token |
| `DB_PATH` | `./data/techstore.db` | Ruta del archivo SQLite |
| `CORS_ORIGIN` | `http://localhost:5173` | Orígenes permitidos (separados por coma) |

### Usuarios de prueba (creados por el seed)

| Rol | Correo | Contraseña |
|---|---|---|
| admin | `admin@techstore.com` | `Admin123!` |
| user | `user@techstore.com` | `User123!` |

## Endpoints

Base URL: `http://localhost:4000/api`. La colección de Postman está en [`docs/TechStore.postman_collection.json`](docs/TechStore.postman_collection.json).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Estado del servicio |
| `POST` | `/auth/register` | Público | Registro (rol `user`) |
| `POST` | `/auth/login` | Público | Login, devuelve `{ user, token }` |
| `GET` | `/auth/me` | Autenticado | Perfil del usuario actual |
| `GET` | `/products` | Autenticado | Lista paginada con filtros |
| `GET` | `/products/:id` | Autenticado | Detalle de producto |
| `POST` | `/products` | Admin | Crear producto |
| `PUT` | `/products/:id` | Admin | Actualizar producto |
| `DELETE` | `/products/:id` | Admin | Eliminar producto |
| `GET` | `/categories` | Autenticado | Categorías con conteo de productos |
| `GET` | `/brands` | Autenticado | Marcas con conteo de productos |
| `GET` | `/reviews?limit=3` | Autenticado | Últimas reseñas (usuario, producto e imagen) |
| `GET` | `/products/:id/reviews` | Autenticado | Reseñas de un producto |
| `POST` | `/products/:id/reviews` | Autenticado | Crear reseña (`rating` 1–5, `comment`); una por usuario y producto |
| `DELETE` | `/reviews/:id` | Autor o admin | Eliminar reseña |
| `GET` | `/images` | Admin | Imágenes locales disponibles para los productos |

**Query params de `GET /products`:** `category` (slug), `brand` (id), `search`, `sort` (`newest` · `price_asc` · `price_desc` · `name`), `page` (≥1), `limit` (1–50, default 6).

**Toda la API requiere sesión** excepto `/health`, `/auth/register` y `/auth/login`: el resto de las rutas exige el header `Authorization: Bearer <token>` (401 sin token o con token inválido/expirado) y las de administración además el rol `admin` (403). Las imágenes estáticas (`/images/...`) son públicas porque una etiqueta `<img>` no puede enviar el header.

### Imágenes

Las fotos de los productos están en `public/images/products` y la API las sirve en `/images/...` (por ejemplo `http://localhost:4000/images/products/iphone-13-pro.webp`). En la base de datos se guarda solo la ruta (`/images/products/...`) y la API la convierte en URL absoluta con `PUBLIC_URL`, así el mismo seed funciona en local y desplegado. Al crear o editar un producto, `image_url` acepta una URL externa o una ruta `/images/...`.

Las fotos provienen del catálogo demo de [DummyJSON](https://dummyjson.com/docs/products).

### Formato de errores

```json
{ "error": "Datos inválidos", "details": [{ "field": "price", "message": "El precio no puede ser negativo" }] }
```

| Código | Cuándo |
|---|---|
| 400 | Validación fallida, JSON mal formado, categoría/marca inexistente |
| 401 | Sin token, token inválido o expirado, credenciales incorrectas |
| 403 | Rol sin permisos (un `user` intentando modificar productos) |
| 404 | Recurso o ruta inexistente |
| 409 | Correo ya registrado |
| 409 | Reseña duplicada (el usuario ya reseñó ese producto) |
| 413 | Body JSON de más de 100 kB |
| 429 | Demasiados intentos de login/registro |

## Arquitectura

```
src/
├── config/        # Variables de entorno
├── db/            # Conexión, schema.sql y seed
├── routes/        # Definición de rutas y middlewares por ruta
├── controllers/   # Traducen HTTP ⇄ servicios
├── services/      # Lógica de negocio y consultas SQL
├── middlewares/   # auth, validate, rateLimit, errorHandler
├── validators/    # Esquemas Zod
├── utils/         # HttpError
├── app.js         # Configuración de Express
└── server.js      # Punto de entrada
test/
├── unit/          # Validadores y middlewares aislados
└── api/           # Endpoints de punta a punta con supertest
```

Cada capa tiene una sola responsabilidad: las rutas solo conectan middlewares, los controladores no conocen SQL y los servicios no conocen `req`/`res`.

## Seguridad

- Contraseñas hasheadas con **bcrypt** (10 rondas). Nunca se devuelven en las respuestas.
- **JWT** firmado con secreto de entorno y expiración configurable.
- **Autenticación obligatoria** en todos los endpoints de datos (`authenticate`) y control de acceso por rol con `authorize('admin')`.
- **Validación** de body, params y query con Zod antes de llegar al controlador.
- **Consultas parametrizadas** en todo el código (sin concatenar entradas del usuario en el SQL).
- **helmet** para cabeceras HTTP seguras, **CORS** restringido al origen del frontend.
- **Rate limiting** en login y registro (20 intentos / 15 min).
- Límite de 100 kB en el body JSON.
- Mensaje genérico en login fallido para no revelar qué correos existen.

## Base de datos

6 tablas normalizadas a 3FN: `roles`, `users`, `categories`, `brands`, `products`, `reviews`. El diagrama entidad-relación y la justificación de la normalización están en [`docs/er-diagram.md`](docs/er-diagram.md).

## Despliegue (Render)

La API está lista para desplegarse en [Render](https://render.com) con el blueprint [`render.yaml`](render.yaml):

1. En Render: **New → Blueprint** y conecta este repositorio.
2. Cuando lo pida, define `CORS_ORIGIN` con la URL del frontend (por ejemplo `https://techstore.vercel.app`).
3. Render instala dependencias, crea la base de datos con el seed (`npm run seed`) y arranca con `npm start`. `JWT_SECRET` se genera automáticamente y `PUBLIC_URL` se toma de la URL que asigna Render (`RENDER_EXTERNAL_URL`).

Notas del plan gratuito:
- La instancia se apaga tras ~15 min sin uso; la primera petición después puede tardar hasta un minuto (el frontend muestra un aviso).
- El disco es efímero: al reiniciarse, la base de datos vuelve a los datos del seed. Para una demo es una ventaja (siempre arranca limpia); en producción real se usaría un disco persistente o una base de datos administrada.
- En producción, Express confía en el proxy de Render (`trust proxy`) para que el rate limiting use la IP real de cada cliente, y CORS solo acepta el origen configurado.
