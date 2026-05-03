/**
 * Mandara SDK error classes
 */

export interface MandaraApiErrorDetails {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export class MandaraApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;

  constructor(input: MandaraApiErrorDetails) {
    super(`${input.code}: ${input.message}`);
    this.name = "MandaraApiError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
    this.requestId = input.requestId;
  }
}

export class MandaraTimeoutError extends Error {
  constructor(message = "Timeout waiting for signature") {
    super(message);
    this.name = "MandaraTimeoutError";
  }
}

export class MandaraValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MandaraValidationError";
  }
}
