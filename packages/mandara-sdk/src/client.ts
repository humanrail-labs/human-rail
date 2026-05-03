/**
 * MandaraClient — typed SDK for the Mandara Agent API (/v1)
 *
 * Requires Node 18+ (global fetch) or a custom fetch implementation.
 */

import {
  MandaraApiError,
  MandaraTimeoutError,
  MandaraValidationError,
} from "./errors.js";
import {
  isTerminalStatus,
} from "./utils.js";
import type {
  MandaraClientOptions,
  SignatureRequestInput,
  SignatureRequestPreview,
  CreateSignatureRequestResponse,
  SignatureRequestResponse,
  AgentStatusResponse,
  WaitForSignatureOptions,
} from "./types.js";

export class MandaraClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: MandaraClientOptions) {
    if (!options.apiKey || typeof options.apiKey !== "string") {
      throw new MandaraValidationError("apiKey is required");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? getDefaultBaseUrl()).replace(/\/$/, "");
    this.fetchFn = options.fetch ?? getFetch();
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  // ── Agent Status ──

  async getAgentStatus(): Promise<AgentStatusResponse> {
    return this.request<AgentStatusResponse>("GET", "/v1/agent/status");
  }

  // ── Preview ──

  async previewSignatureRequest(
    input: SignatureRequestInput
  ): Promise<SignatureRequestPreview> {
    return this.request<SignatureRequestPreview>(
      "POST",
      "/v1/signature-requests/preview",
      input
    );
  }

  // ── Create ──

  async requestSignature(
    input: SignatureRequestInput
  ): Promise<CreateSignatureRequestResponse> {
    return this.request<CreateSignatureRequestResponse>(
      "POST",
      "/v1/signature-requests",
      input
    );
  }

  // ── Get ──

  async getSignatureRequest(id: string): Promise<SignatureRequestResponse> {
    return this.request<SignatureRequestResponse>(
      "GET",
      `/v1/signature-requests/${encodeURIComponent(id)}`
    );
  }

  // ── Poll / Wait ──

  async waitForSignature(
    id: string,
    options: WaitForSignatureOptions = {}
  ): Promise<SignatureRequestResponse> {
    const {
      intervalMs = 3_000,
      timeoutMs = 120_000,
      allowTerminalRejected = false,
    } = options;

    const start = Date.now();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new MandaraTimeoutError(
          `Timeout waiting for signature ${id} after ${timeoutMs}ms`
        ));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        clearInterval(interval);
      };

      const poll = async () => {
        try {
          const result = await this.getSignatureRequest(id);

          if (result.status === "signed") {
            cleanup();
            resolve(result);
            return;
          }

          if (isTerminalStatus(result.status)) {
            cleanup();
            if (allowTerminalRejected) {
              resolve(result);
            } else {
              reject(
                new MandaraApiError({
                  status: 422,
                  code: "SIGNATURE_TERMINAL",
                  message: `Request reached terminal status "${result.status}" without signature.`,
                  details: { status: result.status, nextStep: result.nextStep },
                  requestId: id,
                })
              );
            }
            return;
          }

          if (Date.now() - start + intervalMs > timeoutMs) {
            // Next poll would exceed timeout; let the timer handle it
            return;
          }
        } catch {
          // Polling errors are ignored; we'll retry on next interval
        }
      };

      const interval = setInterval(poll, intervalMs);
      // Immediate first poll
      poll();
    });
  }

  // ── HTTP ──

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        throw new MandaraApiError({
          status: 408,
          code: "REQUEST_TIMEOUT",
          message: `Request to ${path} timed out after ${this.timeoutMs}ms`,
        });
      }
      throw new MandaraApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      clearTimeout(timeout);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new MandaraApiError({
        status: response.status,
        code: "INVALID_RESPONSE",
        message: `API returned non-JSON (status ${response.status})`,
      });
    }

    if (!response.ok) {
      const errorBody = isErrorShape(data) ? data.error : undefined;
      throw new MandaraApiError({
        status: response.status,
        code: errorBody?.code ?? "UNKNOWN",
        message: errorBody?.message ?? `HTTP ${response.status}`,
        details: errorBody?.details,
      });
    }

    // API envelope: { data: T }
    const envelope = data as { data?: T };
    if (envelope.data === undefined) {
      throw new MandaraApiError({
        status: response.status,
        code: "INVALID_RESPONSE",
        message: "API response missing data envelope",
      });
    }

    return envelope.data;
  }
}

// ── Helpers ──

function getDefaultBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.MANDARA_API_URL) {
    return process.env.MANDARA_API_URL;
  }
  return "http://localhost:4000";
}

function getFetch(): typeof fetch {
  if (typeof globalThis !== "undefined" && globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new MandaraValidationError(
    "global fetch is not available. Provide a custom fetch implementation or use Node 18+."
  );
}

function isErrorShape(data: unknown): data is { error?: { code: string; message: string; details?: Record<string, unknown> } } {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as Record<string, unknown>).error === "object"
  );
}
