import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';

/** Verifies the Bearer token and attaches the payload to req.user. */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(HttpError.unauthorized('Token no proporcionado'));
  }
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    next(HttpError.unauthorized('Token inválido o expirado'));
  }
}

/** Restricts the route to the given roles. Use after authenticate. */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(HttpError.forbidden());
    }
    next();
  };
}
