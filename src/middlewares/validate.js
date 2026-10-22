import { HttpError } from '../utils/HttpError.js';

/**
 * Validates req[source] against a Zod schema and stores the parsed
 * result in req.validated[source].
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(HttpError.badRequest('Datos inválidos', details));
    }
    req.validated = { ...req.validated, [source]: result.data };
    next();
  };
}
