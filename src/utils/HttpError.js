export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) { return new HttpError(400, message, details); }
  static unauthorized(message = 'No autenticado') { return new HttpError(401, message); }
  static forbidden(message = 'No tienes permisos para esta acción') { return new HttpError(403, message); }
  static notFound(message = 'Recurso no encontrado') { return new HttpError(404, message); }
  static conflict(message) { return new HttpError(409, message); }
}
