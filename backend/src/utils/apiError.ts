export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg: string, details?: unknown) { return new ApiError(400, msg, details); }
  static unauthorized(msg = "Authentication required") { return new ApiError(401, msg); }
  static forbidden(msg = "You do not have permission to perform this action") { return new ApiError(403, msg); }
  static notFound(msg = "Resource not found") { return new ApiError(404, msg); }
  static conflict(msg: string, details?: unknown) { return new ApiError(409, msg, details); }
  static unprocessable(msg: string, details?: unknown) { return new ApiError(422, msg, details); }
}
