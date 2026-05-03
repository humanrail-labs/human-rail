"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getDevnetDemo,
  listAgents,
  listWallets,
  listPolicies,
  listSigningRequests,
  listMessageApprovals,
  listAuditEvents,
  previewSigningRequest,
  createSigningRequest,
  enqueueSigningRequest,
  getSigningRequestExecution,
  listAgentApiKeys,
  createAgentApiKey,
  revokeAgentApiKey,
  listWebhooks,
  createWebhook,
  deleteWebhook,
  exportAuditEvents,
} from "@/lib/mandara-api/client";
import type {
  Agent,
  IkaDwallet,
  GuardedPolicy,
  SigningRequest,
  MessageApproval,
  AuditEvent,
  DevnetDemoSnapshot,
  PreviewSigningRequestInput,
  CreateSigningRequestInput,
  CreateAgentApiKeyInput,
} from "@/lib/mandara-api/types";

export interface MandaraProductState {
  loading: boolean;
  error: string | null;
  apiAvailable: boolean | null;
  devnetDemo: DevnetDemoSnapshot | null;
  agents: Agent[];
  wallets: IkaDwallet[];
  policies: GuardedPolicy[];
  signingRequests: SigningRequest[];
  messageApprovals: MessageApproval[];
  auditEvents: AuditEvent[];
}

export function useMandaraProduct() {
  const [state, setState] = useState<MandaraProductState>({
    loading: true,
    error: null,
    apiAvailable: null,
    devnetDemo: null,
    agents: [],
    wallets: [],
    policies: [],
    signingRequests: [],
    messageApprovals: [],
    auditEvents: [],
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const devnetDemo = await getDevnetDemo();

      const [agents, wallets, policies, signingRequests, messageApprovals, auditEvents] =
        await Promise.all([
          listAgents().catch(() => [] as Agent[]),
          listWallets().catch(() => [] as IkaDwallet[]),
          listPolicies().catch(() => [] as GuardedPolicy[]),
          listSigningRequests().catch(() => [] as SigningRequest[]),
          listMessageApprovals().catch(() => [] as MessageApproval[]),
          listAuditEvents({ limit: 50 }).catch(() => [] as AuditEvent[]),
        ]);

      setState({
        loading: false,
        error: null,
        apiAvailable: true,
        devnetDemo,
        agents,
        wallets,
        policies,
        signingRequests,
        messageApprovals,
        auditEvents,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const message =
        msg.includes("fetch") || msg.includes("ECONNREFUSED")
          ? "Mandara API is not running. Start it with npm run product:api:dev."
          : msg || "Failed to load dashboard data";

      setState((s) => ({
        ...s,
        loading: false,
        error: message,
        apiAvailable: false,
        devnetDemo: null,
      }));
    }
  }, []);

  const preview = useCallback(
    async (input: PreviewSigningRequestInput) => {
      return previewSigningRequest(input);
    },
    []
  );

  const create = useCallback(async (input: CreateSigningRequestInput) => {
    return createSigningRequest(input);
  }, []);

  const enqueue = useCallback(async (id: string) => {
    return enqueueSigningRequest(id);
  }, []);

  const fetchExecution = useCallback(async (id: string) => {
    return getSigningRequestExecution(id);
  }, []);

  const startPollingExecution = useCallback(
    (id: string, onUpdate: (result: Awaited<ReturnType<typeof getSigningRequestExecution>>) => void) => {
      if (pollRef.current) clearInterval(pollRef.current);

      let elapsed = 0;
      const interval = setInterval(async () => {
        elapsed += 4000;
        if (elapsed > 120_000) {
          clearInterval(interval);
          pollRef.current = null;
          return;
        }
        try {
          const result = await getSigningRequestExecution(id);
          onUpdate(result);
          const terminal = ["signed", "policy_rejected", "failed"];
          if (terminal.includes(result.signingRequest.status)) {
            clearInterval(interval);
            pollRef.current = null;
          }
        } catch {
          // ignore polling errors
        }
      }, 4000);

      pollRef.current = interval;
      return () => {
        clearInterval(interval);
        pollRef.current = null;
      };
    },
    []
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const listApiKeys = useCallback(async (agentId: string) => {
    return listAgentApiKeys(agentId);
  }, []);

  const createApiKey = useCallback(async (agentId: string, input: CreateAgentApiKeyInput) => {
    return createAgentApiKey(agentId, input);
  }, []);

  const revokeApiKey = useCallback(async (agentId: string, keyId: string) => {
    return revokeAgentApiKey(agentId, keyId);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => refresh(), 0);
    return () => {
      clearTimeout(timer);
      stopPolling();
    };
  }, [refresh, stopPolling]);

  return {
    ...state,
    refresh,
    previewSigningRequest: preview,
    createSigningRequest: create,
    enqueueSigningRequest: enqueue,
    fetchExecution,
    startPollingExecution,
    stopPolling,
    listApiKeys,
    createApiKey,
    revokeApiKey,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    exportAuditEvents,
  };
}
