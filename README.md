# TechStore API

API REST de la tienda de productos tecnológicos **TechStore**, desarrollada para el periodo de prueba de Desarrollo de Software de Turing IA.

**Stack:** Node.js · Express 5 · SQLite (`node:sqlite`) · JWT · bcrypt · Zod

Frontend: repositorio `techstore-web`.

## Requisitos

- **Node.js 22.5 o superior** (se usa el módulo nativo `node:sqlite`, así que no hay que instalar ningún servidor de base de datos)
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
| `GET` | `/products` | Público | Lista paginada con filtros |
| `GET` | `/products/:id` | Público | Detalle de producto |
| `POST` | `/products` | Admin | Crear producto |
| `PUT` | `/products/:id` | Admin | Actualizar producto |
| `DELETE` | `/products/:id` | Admin | Eliminar producto |
| `GET` | `/categories` | Público | Categorías con conteo de productos |
| `GET` | `/brands` | Público | Marcas con conteo de productos |

**Query params de `GET /products`:** `category` (slug), `brand` (id), `search`, `sort` (`newest` · `price_asc` · `price_desc` · `name`), `page` (≥1), `limit` (1–50, default 6).

Las rutas protegidas requieren el header `Authorization: Bearer <token>`.

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
```

Cada capa tiene una sola responsabilidad: las rutas solo conectan middlewares, los controladores no conocen SQL y los servicios no conocen `req`/`res`.

## Seguridad

- Contraseñas hasheadas con **bcrypt** (10 rondas). Nunca se devuelven en las respuestas.
- **JWT** firmado con secreto de entorno y expiración configurable.
- Control de acceso por rol con el middleware `authorize('admin')`.
- **Validación** de body, params y query con Zod antes de llegar al controlador.
- **Consultas parametrizadas** en todo el código (sin concatenar entradas del usuario en el SQL).
- **helmet** para cabeceras HTTP seguras, **CORS** restringido al origen del frontend.
- **Rate limiting** en login y registro (20 intentos / 15 min).
- Límite de 100 kB en el body JSON.
- Mensaje genérico en login fallido para no revelar qué correos existen.

## Base de datos

6 tablas normalizadas a 3FN: `roles`, `users`, `categories`, `brands`, `products`, `reviews`. El diagrama entidad-relación y la justificación de la normalización están en [`docs/er-diagram.md`](docs/er-diagram.md).
