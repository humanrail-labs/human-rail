export function success<T>(data: T, meta?: Record<string, unknown>) {
  return { data, ...(meta ? { meta } : {}) };
}

export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}
