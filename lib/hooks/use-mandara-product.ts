"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getDevnetDemo,
  listOrganizations,
  createOrganization,
  listAgents,
  createAgent,
  updateAgent,
  updateAgentStatus,
  deleteAgent,
  listWallets,
  importWallet,
  listPolicies,
  createPolicy,
  listSigningRequests,
  listMessageApprovals,
  listAuditEvents,
  previewSigningRequest,
  createSigningRequest,
  enqueueSigningRequest,
  getSigningRequestExecution,
  getSubscription,
  listAgentChatSessions,
  createAgentChatSession,
  getAgentChatSession,
  sendAgentChatMessage,
  approveAgentProposal,
  rejectAgentProposal,
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
  Organization,
  CreateAgentInput,
  ImportWalletInput,
  CreatePolicyInput,
  CreateOrganizationInput,
} from "@/lib/mandara-api/types";

export interface MandaraProductState {
  loading: boolean;
  error: string | null;
  apiAvailable: boolean | null;
  devnetDemo: DevnetDemoSnapshot | null;
  organizations: Organization[];
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
    organizations: [],
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

      const [organizations, agents, wallets, policies, signingRequests, messageApprovals, auditEvents] =
        await Promise.all([
          listOrganizations().catch(() => [] as Organization[]),
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
        organizations,
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

  const createOrg = useCallback(async (input: CreateOrganizationInput) => {
    const org = await createOrganization(input);
    await refresh();
    return org;
  }, [refresh]);

  const createNewAgent = useCallback(async (input: CreateAgentInput) => {
    const agent = await createAgent(input);
    await refresh();
    return agent;
  }, [refresh]);

  const updateAgentData = useCallback(async (id: string, input: { name?: string; description?: string }) => {
    const agent = await updateAgent(id, input);
    await refresh();
    return agent;
  }, [refresh]);

  const updateAgentStatusData = useCallback(async (id: string, status: "active" | "suspended" | "revoked") => {
    const agent = await updateAgentStatus(id, status);
    await refresh();
    return agent;
  }, [refresh]);

  const deleteAgentData = useCallback(async (id: string) => {
    await deleteAgent(id);
    await refresh();
  }, [refresh]);

  const importNewWallet = useCallback(async (input: ImportWalletInput) => {
    const wallet = await importWallet(input);
    await refresh();
    return wallet;
  }, [refresh]);

  const createNewPolicy = useCallback(async (input: CreatePolicyInput) => {
    const policy = await createPolicy(input);
    await refresh();
    return policy;
  }, [refresh]);

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
    getSubscription,
    startPollingExecution,
    stopPolling,
    listAgentChatSessions,
    createAgentChatSession,
    getAgentChatSession,
    sendAgentChatMessage,
    approveAgentProposal,
    rejectAgentProposal,
    listApiKeys,
    createApiKey,
    revokeApiKey,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    exportAuditEvents,
    createOrganization: createOrg,
    createAgent: createNewAgent,
    updateAgent: updateAgentData,
    updateAgentStatus: updateAgentStatusData,
    deleteAgent: deleteAgentData,
    importWallet: importNewWallet,
    createPolicy: createNewPolicy,
  };
}
