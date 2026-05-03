/**
 * Mandara SDK utilities
 */

import type { SignatureRequestResponse, SignatureRequestStatus } from "./types.js";

export function isSigned(response: SignatureRequestResponse): boolean {
  return response.status === "signed";
}

export function isRejected(response: SignatureRequestResponse): boolean {
  return response.status === "policy_rejected" || response.status === "failed";
}

export function assertSigned(response: SignatureRequestResponse): asserts response is SignatureRequestResponse & { status: "signed"; signature: string } {
  if (!isSigned(response)) {
    throw new Error(
      `Expected status "signed" but got "${response.status}". Reason: ${response.nextStep}`
    );
  }
  if (!response.signature) {
    throw new Error("Status is signed but no signature present in response");
  }
}

export function isTerminalStatus(status: SignatureRequestStatus): boolean {
  return ["signed", "policy_rejected", "failed"].includes(status);
}
