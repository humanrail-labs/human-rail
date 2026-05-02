export class MandaraError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "MandaraError";
  }
}

export const Errors = {
  unauthorized: (msg = "Unauthorized") =>
    new MandaraError("UNAUTHORIZED", 401, msg),
  forbidden: (msg = "Forbidden") =>
    new MandaraError("FORBIDDEN", 403, msg),
  notFound: (msg = "Not found") =>
    new MandaraError("NOT_FOUND", 404, msg),
  validation: (msg: string, details?: Record<string, unknown>) =>
    new MandaraError("VALIDATION_ERROR", 400, msg, details),
  conflict: (msg = "Conflict") =>
    new MandaraError("CONFLICT", 409, msg),
  notImplemented: (msg = "Not implemented in P1") =>
    new MandaraError("NOT_IMPLEMENTED", 501, msg),
  internal: (msg = "Internal server error") =>
    new MandaraError("INTERNAL_ERROR", 500, msg),
} as const;
