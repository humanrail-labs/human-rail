"use client";

import { useCallback, useState, useRef, useEffect } from "react";

type KycStatus =
  | "idle"
  | "creating_session"
  | "pending"
  | "approved"
  | "attested"
  | "declined"
  | "chain_error"
  | "error";

export interface KycState {
  status: KycStatus;
  sessionId: string | null;
  verificationUrl: string | null;
  txSignature: string | null;
  attestationPda: string | null;
  error: string | null;
}

const POLL_MS = 5_000;

const ALLOWED_KYC_HOSTS = [
  "localhost",
  "127.0.0.1",
  "humanrail-kyc-issuer.fly.dev",
];

function getKycServiceUrl(): string {
  const url = process.env.NEXT_PUBLIC_KYC_SERVICE_URL || "http://localhost:3100";
  if (process.env.NODE_ENV === "production") {
    try {
      const host = new URL(url).hostname;
      if (!ALLOWED_KYC_HOSTS.includes(host)) {
        throw new Error(`KYC service URL not in allowlist: ${host}`);
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("allowlist")) throw e;
      throw new Error(`Invalid KYC service URL: ${url}`);
    }
  }
  return url;
}

export function useKyc(walletPubkey: string | null) {
  const [state, setState] = useState<KycState>({
    status: "idle",
    sessionId: null,
    verificationUrl: null,
    txSignature: null,
    attestationPda: null,
    error: null,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Start KYC session (calls backend, never Veriff directly) ──
  const startKyc = useCallback(async (): Promise<string | null> => {
    if (!walletPubkey) return null;

    setState((s) => ({ ...s, status: "creating_session", error: null }));

    try {
      const baseUrl = getKycServiceUrl();
      const res = await fetch(`${baseUrl}/kyc/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletPubkey }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Session creation failed (${res.status}): ${body}`);
      }

      const data = await res.json();
      setState({
        status: "pending",
        sessionId: data.sessionId,
        verificationUrl: data.verificationUrl,
        txSignature: null,
        attestationPda: null,
        error: null,
      });

      return data.verificationUrl as string;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start KYC";
      setState((s) => ({ ...s, status: "error", error: msg }));
      return null;
    }
  }, [walletPubkey]);

  // ── Poll status from KYC issuer service ──
  const checkStatus = useCallback(async () => {
    if (!walletPubkey) return;

    try {
      const baseUrl = getKycServiceUrl();
      const res = await fetch(
        `${baseUrl}/kyc/status?walletPubkey=${walletPubkey}`
      );
      if (!res.ok) return;

      const data = await res.json();

      if (data.status === "attested") {
        setState((s) => ({
          ...s,
          status: "attested",
          txSignature: data.txSignature ?? s.txSignature,
          attestationPda: data.attestationPda ?? s.attestationPda,
        }));
        stopPolling();
      } else if (data.status === "approved") {
        setState((s) => ({ ...s, status: "approved" }));
      } else if (
        data.status === "declined" ||
        data.status === "resubmission_requested"
      ) {
        setState((s) => ({ ...s, status: "declined" }));
        stopPolling();
      } else if (data.status === "chain_error") {
        setState((s) => ({ ...s, status: "chain_error" }));
      }
    } catch {
      // silent — polling is best-effort
    }
  }, [walletPubkey, stopPolling]);

  // ── Auto-poll when pending or approved ──
  useEffect(() => {
    if (state.status === "pending" || state.status === "approved") {
      if (!pollRef.current) {
        pollRef.current = setInterval(checkStatus, POLL_MS);
      }
    }
    return stopPolling;
  }, [state.status, checkStatus, stopPolling]);

  // ── Check existing status on mount ──
  useEffect(() => {
    if (walletPubkey) {
      checkStatus();
    }
  }, [walletPubkey, checkStatus]);

  const reset = useCallback(() => {
    stopPolling();
    setState({
      status: "idle",
      sessionId: null,
      verificationUrl: null,
      txSignature: null,
      attestationPda: null,
      error: null,
    });
  }, [stopPolling]);

  return { ...state, startKyc, checkStatus, reset };
}

export type { KycStatus };
