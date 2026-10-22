import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';

export function notFound(req, _res, next) {
  next(HttpError.notFound(`Ruta ${req.method} ${req.originalUrl} no encontrada`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado' });
  }

  const status = err instanceof HttpError ? err.status : 500;
  if (status === 500) console.error(err);

  res.status(status).json({
    error: status === 500 && env.nodeEnv === 'production' ? 'Error interno del servidor' : err.message,
    ...(err.details && { details: err.details }),
  });
}
