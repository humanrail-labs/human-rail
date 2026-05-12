import { prisma } from "@mandara/db";
import { Prisma } from "@prisma/client";
import {
  classifyMandaraScope,
  evaluateSigningRequest,
  type AgentIntentExtractionResult,
} from "@mandara/core";
import { recordAuditEvent } from "../lib/audit.js";
import { enqueueSigningRequest } from "./queue.js";
import { scheduleWebhookEvent } from "./webhookEvents.js";
import { createAgentIntentProvider } from "./llm/provider.js";
import { DeterministicAgentIntentProvider } from "./llm/deterministicParser.js";
import { checkUsageLimit, recordUsage } from "./usage.js";

export interface AgentChatActor {
  userId?: string;
  organizationId: string;
}

export async function getOrCreateAgentChatSession(input: {
  organizationId: string;
  sessionId?: string;
  agentId?: string;
  title?: string;
  userId?: string;
}) {
  if (input.sessionId) {
    const session = await prisma.agentChatSession.findFirst({
      where: { id: input.sessionId, organizationId: input.organizationId },
    });
    if (!session) return null;
    return session;
  }

  const session = await prisma.agentChatSession.create({
    data: {
      organizationId: input.organizationId,
      agentId: input.agentId,
      title: input.title,
      createdByUserId: input.userId,
    },
  });

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorType: "user",
    actorId: input.userId,
    eventType: "agent_chat_session_created",
    resourceType: "agent_chat_session",
    resourceId: session.id,
    summary: "Created Agent Chat session",
  });

  return session;
}

export async function handleAgentChatMessage(input: {
  organizationId: string;
  sessionId?: string;
  agentId?: string;
  message: string;
  mode?: "assist" | "prepare_signature_request";
  userId?: string;
}) {
  const usageLimit = await checkUsageLimit(input.organizationId, "agent_chat_message");
  if (!usageLimit.allowed) {
    await recordAuditEvent({
      organizationId: input.organizationId,
      actorType: "user",
      actorId: input.userId,
      eventType: "subscription_limit_exceeded",
      resourceType: "subscription",
      resourceId: usageLimit.subscription.id,
      summary: "Agent Chat monthly limit exceeded",
      metadata: { used: usageLimit.used, limit: usageLimit.limit },
    });
    return {
      error: {
        status: 402,
        code: "SUBSCRIPTION_LIMIT_EXCEEDED",
        message: "Your current plan has reached the monthly Agent Chat limit.",
      },
    };
  }

  const session = await getOrCreateAgentChatSession({
    organizationId: input.organizationId,
    sessionId: input.sessionId,
    agentId: input.agentId,
    title: input.message.slice(0, 80),
    userId: input.userId,
  });
  if (!session) {
    return { error: { status: 404, code: "NOT_FOUND", message: "Agent Chat session not found" } };
  }

  const scope = classifyMandaraScope(input.message);

  const userMessage = await prisma.agentChatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: input.message,
      scopeAllowed: scope.allowed,
      scopeReason: scope.reason,
      metadata: { mode: input.mode ?? "assist", scopeCategory: scope.category } as Prisma.JsonObject,
    },
  });
  await recordAuditEvent({
    organizationId: input.organizationId,
    actorType: "user",
    actorId: input.userId,
    eventType: "agent_chat_message_created",
    resourceType: "agent_chat_session",
    resourceId: session.id,
    summary: "Created Agent Chat user message",
  });

  if (!scope.allowed) {
    const refusal = buildScopeRefusal(input.message, scope.category);
    const assistantMessage = await createAssistantMessage(session.id, refusal, {
      metadata: { scope },
      scopeAllowed: false,
      scopeReason: scope.reason,
      provider: "scope_guard",
      model: "mandara-scope-guard",
    });
    await recordAuditEvent({
      organizationId: input.organizationId,
      actorType: "user",
      actorId: input.userId,
      eventType: "agent_chat_scope_rejected",
      resourceType: "agent_chat_session",
      resourceId: session.id,
      summary: "Rejected out-of-scope Agent Chat message",
      metadata: scope as unknown as Prisma.JsonObject,
    });
    return {
      session: await loadSession(session.id),
      userMessage,
      assistantMessage,
      scope,
      nextAction: "informational" as const,
    };
  }

  const provider = createAgentIntentProvider();
  let intent: AgentIntentExtractionResult;
  let providerName = provider.name;
  let providerModel = provider.model;
  let fallbackUsed = false;
  try {
    const result = await provider.extractIntent({
      message: input.message.slice(0, 4000),
      mode: input.mode,
    });
    intent = result.intent;
    providerName = result.provider;
    providerModel = result.model;
    fallbackUsed = !!result.fallbackUsed;
  } catch {
    const fallback = new DeterministicAgentIntentProvider();
    const result = await fallback.extractIntent({
      message: input.message,
      mode: "prepare_signature_request",
    });
    intent = result.intent;
    providerName = result.provider;
    providerModel = result.model;
    fallbackUsed = true;
  }

  // Minimal follow-up context: merge with previous partial intent if present
  const sessionMeta = (session.metadata ?? {}) as Record<string, unknown>;
  const partialIntent = sessionMeta.partialIntent as Record<string, string | number | undefined> | undefined;
  if (partialIntent && intent.intentType === "signature_request" && intent.signatureRequest) {
    intent.signatureRequest = {
      destinationChainId: intent.signatureRequest.destinationChainId ?? (typeof partialIntent.destinationChainId === "number" ? partialIntent.destinationChainId : undefined),
      asset: intent.signatureRequest.asset ?? (typeof partialIntent.asset === "string" ? partialIntent.asset : undefined),
      recipient: intent.signatureRequest.recipient ?? (typeof partialIntent.recipient === "string" ? partialIntent.recipient : undefined),
      amount: intent.signatureRequest.amount ?? (typeof partialIntent.amount === "string" ? partialIntent.amount : undefined),
      message: intent.signatureRequest.message ?? (typeof partialIntent.message === "string" ? partialIntent.message : undefined),
      policyId: intent.signatureRequest.policyId ?? (typeof partialIntent.policyId === "string" ? partialIntent.policyId : undefined),

    };
  }

  await recordUsage({
    organizationId: input.organizationId,
    type: "agent_chat_message",
    source: "agent_chat",
    metadata: { provider: providerName, model: providerModel, fallbackUsed },
  });

  if (intent.intentType !== "signature_request") {
    const content = buildInformationalAnswer(input.message, intent);
    const assistantMessage = await createAssistantMessage(session.id, content, {
      metadata: { intent, fallbackUsed },
      provider: providerName,
      model: providerModel,
      scopeAllowed: true,
      scopeReason: scope.reason,
    });
    return {
      session: await loadSession(session.id),
      userMessage,
      assistantMessage,
      nextAction: "informational" as const,
    };
  }

  const resolvedAgent = await resolveAgent(input.organizationId, input.agentId ?? session.agentId ?? undefined);
  if (resolvedAgent.kind !== "ok") {
    const assistantMessage = await createAssistantMessage(session.id, resolvedAgent.message, {
      metadata: { intent, fallbackUsed },
      provider: providerName,
      model: providerModel,
      scopeAllowed: true,
      scopeReason: scope.reason,
    });
    return {
      session: await loadSession(session.id),
      userMessage,
      assistantMessage,
      nextAction: "informational" as const,
    };
  }

  if (!session.agentId && resolvedAgent.agent.id) {
    await prisma.agentChatSession.update({
      where: { id: session.id },
      data: { agentId: resolvedAgent.agent.id },
    });
  }

  const resolvedPolicy = await resolvePolicy(
    input.organizationId,
    resolvedAgent.agent.id,
    intent.signatureRequest?.policyId ?? undefined
  );
  if (resolvedPolicy.kind !== "ok") {
    const assistantMessage = await createAssistantMessage(session.id, resolvedPolicy.message, {
      metadata: { intent, fallbackUsed },
      provider: providerName,
      model: providerModel,
      scopeAllowed: true,
      scopeReason: scope.reason,
    });
    return {
      session: await loadSession(session.id),
      userMessage,
      assistantMessage,
      nextAction: "informational" as const,
    };
  }

  const structuredInput = fillFromPolicy(intent.signatureRequest ?? {}, resolvedPolicy.policy, input.message);
  const missingFields = findMissingFields(structuredInput);
  if (missingFields.length > 0) {
    // Store partial intent in session metadata for follow-up
    await prisma.agentChatSession.update({
      where: { id: session.id },
      data: {
        metadata: {
          ...sessionMeta,
          partialIntent: structuredInput,
        } as Prisma.JsonObject,
      },
    });

    const assistantMessage = await createAssistantMessage(
      session.id,
      buildMissingFieldsMessage(missingFields, structuredInput),
      {
        metadata: { intent, missingFields, fallbackUsed },
        provider: providerName,
        model: providerModel,
        scopeAllowed: true,
        scopeReason: scope.reason,
      }
    );
    return {
      session: await loadSession(session.id),
      userMessage,
      assistantMessage,
      nextAction: "ask_user_for_missing_fields" as const,
    };
  }

  // Clear partial intent when complete
  if (partialIntent) {
    await prisma.agentChatSession.update({
      where: { id: session.id },
      data: {
        metadata: {
          ...sessionMeta,
          partialIntent: undefined,
        } as Prisma.JsonObject,
      },
    });
  }

  const policyDecision = evaluatePolicy(resolvedPolicy.policy, structuredInput as CompleteStructuredInput);
  const proposal = await prisma.agentActionProposal.create({
    data: {
      sessionId: session.id,
      organizationId: input.organizationId,
      agentId: resolvedAgent.agent.id,
      policyId: resolvedPolicy.policy.id,
      status: policyDecision.allowed ? "preview_allowed" : "preview_rejected",
      naturalLanguageIntent: input.message,
      structuredInput: structuredInput as unknown as Prisma.JsonObject,
      policyDecision: policyDecision as unknown as Prisma.JsonObject,
      rejectionReason: policyDecision.allowed ? null : policyDecision.reason,
    },
    include: {
      agent: { select: { id: true, name: true } },
      policy: { select: { id: true, name: true } },
    },
  });

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorType: "user",
    actorId: input.userId,
    eventType: "agent_chat_proposal_created",
    resourceType: "agent_action_proposal",
    resourceId: proposal.id,
    summary: "Created Agent Chat signature request proposal",
    metadata: { allowed: policyDecision.allowed },
  });
  await recordAuditEvent({
    organizationId: input.organizationId,
    actorType: "user",
    actorId: input.userId,
    eventType: "agent_chat_proposal_previewed",
    resourceType: "agent_action_proposal",
    resourceId: proposal.id,
    summary: `Previewed Agent Chat proposal: ${policyDecision.allowed ? "allowed" : "rejected by mandate"}`,
    metadata: { allowed: policyDecision.allowed, rejectionCode: policyDecision.rejectionCode },
  });

  const assistantMessage = await createAssistantMessage(
    session.id,
    buildProposalMessage(policyDecision.allowed, policyDecision.reason),
    {
      metadata: { intent, proposalId: proposal.id, policyDecision, fallbackUsed },
      provider: providerName,
      model: providerModel,
      scopeAllowed: true,
      scopeReason: scope.reason,
    }
  );

  return {
    session: await loadSession(session.id),
    userMessage,
    assistantMessage,
    proposal,
    policyDecision,
    nextAction: "user_approve_or_reject" as const,
  };
}

export async function approveAgentActionProposal(input: {
  proposalId: string;
  enqueue?: boolean;
  actor: AgentChatActor;
}) {
  const proposal = await prisma.agentActionProposal.findFirst({
    where: {
      id: input.proposalId,
      organizationId: input.actor.organizationId,
    },
  });

  if (!proposal) {
    return { error: { status: 404, code: "NOT_FOUND", message: "Proposal not found" } };
  }
  if (proposal.status !== "preview_allowed") {
    return {
      error: {
        status: 409,
        code: "CONFLICT",
        message: `Only allowed preview proposals can be approved (current status: ${proposal.status})`,
      },
    };
  }
  if (!proposal.agentId || !proposal.policyId) {
    return { error: { status: 409, code: "CONFLICT", message: "Proposal is missing agent or mandate" } };
  }

  const structured = proposal.structuredInput as unknown as CompleteStructuredInput;
  const policy = await prisma.guardedPolicy.findFirst({
    where: {
      id: proposal.policyId,
      organizationId: input.actor.organizationId,
      agentId: proposal.agentId,
    },
    include: {
      agent: { select: { status: true } },
      ikaDwallet: { select: { state: true, id: true } },
    },
  });
  if (!policy) {
    return { error: { status: 404, code: "NOT_FOUND", message: "Mandate not found" } };
  }

  const policyDecision = evaluatePolicy(policy, structured);
  if (!policyDecision.allowed) {
    await prisma.agentActionProposal.update({
      where: { id: proposal.id },
      data: {
        status: "failed",
        policyDecision: policyDecision as unknown as Prisma.JsonObject,
        rejectionReason: policyDecision.reason,
      },
    });
    return { error: { status: 422, code: "POLICY_REJECTED", message: policyDecision.reason } };
  }

  const requestId = crypto.randomUUID().replace(/-/g, "");
  const signingRequest = await prisma.signingRequest.create({
    data: {
      organizationId: input.actor.organizationId,
      agentId: proposal.agentId,
      policyId: proposal.policyId,
      ikaDwalletId: policy.ikaDwallet?.id ?? null,
      requestId,
      messageDigest: `0x${policyDecision.computed.messageDigest}`,
      messageMetadataDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
      destinationChainId: structured.destinationChainId,
      asset: structured.asset.trim().toUpperCase(),
      recipient: structured.recipient.trim().toLowerCase(),
      assetHash: policyDecision.computed.assetHash,
      recipientHash: policyDecision.computed.recipientHash,
      amount: structured.amount,
      message: structured.message,
      signatureScheme: "EcdsaKeccak256",
      status: "requested",
      metadata: {
        evaluation: policyDecision,
        source: "agent_chat",
        proposalId: proposal.id,
        nextStep: "Awaiting worker execution",
      } as unknown as Prisma.JsonObject,
    },
  });

  await recordAuditEvent({
    organizationId: input.actor.organizationId,
    actorType: "user",
    actorId: input.actor.userId,
    eventType: "agent_chat_proposal_approved",
    resourceType: "agent_action_proposal",
    resourceId: proposal.id,
    summary: "Approved Agent Chat proposal",
  });
  await recordAuditEvent({
    organizationId: input.actor.organizationId,
    actorType: "user",
    actorId: input.actor.userId,
    eventType: "agent_chat_request_created",
    resourceType: "signing_request",
    resourceId: signingRequest.id,
    summary: `Created signature request ${requestId} from Agent Chat approval`,
    metadata: { proposalId: proposal.id, requestId },
  });
  await recordAuditEvent({
    organizationId: input.actor.organizationId,
    actorType: "user",
    actorId: input.actor.userId,
    eventType: "signing_request_created",
    resourceType: "signing_request",
    resourceId: signingRequest.id,
    summary: `Created signing request ${requestId}`,
    metadata: { requestId, allowed: true, source: "agent_chat" },
  });

  await scheduleWebhookEvent({
    organizationId: input.actor.organizationId,
    eventType: "signature.requested",
    signingRequestId: signingRequest.id,
    data: {
      signingRequestId: signingRequest.id,
      requestId,
      status: "requested",
      destinationChainId: structured.destinationChainId,
      asset: structured.asset,
      recipient: structured.recipient,
      amount: structured.amount,
    },
  });

  await recordUsage({
    organizationId: input.actor.organizationId,
    type: "signature_request_created",
    source: "agent_chat",
    metadata: { proposalId: proposal.id, signingRequestId: signingRequest.id },
  });

  let execution: { jobId: string | undefined; queue: string; status: string } | undefined;
  let updatedSigningRequest = signingRequest;
  let proposalStatus: "request_created" | "queued" = "request_created";
  if (input.enqueue) {
    const job = await enqueueSigningRequest({
      signingRequestId: signingRequest.id,
      organizationId: input.actor.organizationId,
      requestedBy: input.actor.userId,
    });
    updatedSigningRequest = await prisma.signingRequest.update({
      where: { id: signingRequest.id },
      data: {
        status: "queued",
        executionJobId: job.id ?? null,
      },
    });
    proposalStatus = "queued";
    execution = { jobId: job.id, queue: "mandara.signing-requests", status: "queued" };

    await recordAuditEvent({
      organizationId: input.actor.organizationId,
      actorType: "user",
      actorId: input.actor.userId,
      eventType: "agent_chat_request_enqueued",
      resourceType: "signing_request",
      resourceId: signingRequest.id,
      summary: `Enqueued Agent Chat signature request ${requestId}`,
      metadata: { proposalId: proposal.id, jobId: job.id, queue: "mandara.signing-requests" },
    });
    await recordAuditEvent({
      organizationId: input.actor.organizationId,
      actorType: "user",
      actorId: input.actor.userId,
      eventType: "signing_request_queued",
      resourceType: "signing_request",
      resourceId: signingRequest.id,
      summary: `Enqueued signing request ${requestId} for worker execution`,
      metadata: { jobId: job.id, queue: "mandara.signing-requests", source: "agent_chat" },
    });
    await scheduleWebhookEvent({
      organizationId: input.actor.organizationId,
      eventType: "signature.queued",
      signingRequestId: signingRequest.id,
      data: {
        signingRequestId: signingRequest.id,
        requestId,
        status: "queued",
        jobId: job.id,
      },
    });
  }

  const updatedProposal = await prisma.agentActionProposal.update({
    where: { id: proposal.id },
    data: {
      status: proposalStatus,
      signingRequestId: signingRequest.id,
      policyDecision: policyDecision as unknown as Prisma.JsonObject,
    },
  });

  await createToolMessage(
    proposal.sessionId,
    `Signature request created${input.enqueue ? " and enqueued" : ""}.`,
    { proposalId: proposal.id, signingRequestId: signingRequest.id, enqueued: !!input.enqueue }
  );

  return {
    proposal: updatedProposal,
    signingRequest: updatedSigningRequest,
    execution,
    nextStep: input.enqueue ? "queued_for_worker" : "created_waiting_for_enqueue",
  };
}

export async function rejectAgentActionProposal(input: {
  proposalId: string;
  reason?: string;
  actor: AgentChatActor;
}) {
  const proposal = await prisma.agentActionProposal.findFirst({
    where: { id: input.proposalId, organizationId: input.actor.organizationId },
  });
  if (!proposal) {
    return { error: { status: 404, code: "NOT_FOUND", message: "Proposal not found" } };
  }

  const updated = await prisma.agentActionProposal.update({
    where: { id: proposal.id },
    data: {
      status: "user_rejected",
      rejectionReason: input.reason ?? "Rejected by user",
    },
  });
  await createToolMessage(proposal.sessionId, "Signature request proposal rejected. No signature request was created.", {
    proposalId: proposal.id,
    reason: input.reason,
  });
  await recordAuditEvent({
    organizationId: input.actor.organizationId,
    actorType: "user",
    actorId: input.actor.userId,
    eventType: "agent_chat_proposal_rejected",
    resourceType: "agent_action_proposal",
    resourceId: proposal.id,
    summary: "Rejected Agent Chat proposal",
    metadata: { reason: input.reason },
  });

  return { proposal: updated };
}

type PolicyRecord = NonNullable<Awaited<ReturnType<typeof prisma.guardedPolicy.findFirst>>>;

interface CompleteStructuredInput {
  destinationChainId: number;
  asset: string;
  recipient: string;
  amount: string;
  message: string;
}

function evaluatePolicy(policy: PolicyRecord, input: CompleteStructuredInput) {
  return evaluateSigningRequest(
    {
      ...policy,
      perTxLimit: policy.perTxLimit.toString(),
      dailyLimit: policy.dailyLimit.toString(),
      totalLimit: policy.totalLimit.toString(),
    },
    input
  );
}

function fillFromPolicy(
  structuredInput: AgentIntentExtractionResult["signatureRequest"],
  policy: PolicyRecord,
  originalMessage: string
) {
  const lower = originalMessage.toLowerCase();
  return {
    destinationChainId: structuredInput?.destinationChainId ?? policy.allowedChainId,
    asset: structuredInput?.asset ?? policy.allowedAsset ?? undefined,
    recipient: structuredInput?.recipient ??
      (lower.includes("approved recipient") ? policy.allowedRecipient ?? undefined : undefined),
    amount: structuredInput?.amount,
    message: structuredInput?.message ?? originalMessage,
    policyId: structuredInput?.policyId ?? policy.id,
    agentId: policy.agentId,
  };
}

function findMissingFields(input: Record<string, unknown>) {
  return ["destinationChainId", "asset", "recipient", "amount", "message"].filter((field) => {
    const value = input[field];
    return value === undefined || value === null || value === "";
  });
}

async function resolveAgent(organizationId: string, agentId?: string) {
  if (agentId) {
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, organizationId, status: "active" },
    });
    if (!agent) return { kind: "error" as const, message: "I could not find an active agent for this chat." };
    return { kind: "ok" as const, agent };
  }

  const agents = await prisma.agent.findMany({
    where: { organizationId, status: "active" },
    orderBy: { createdAt: "desc" },
    take: 2,
  });
  if (agents.length === 0) {
    return { kind: "error" as const, message: "Create an active Agent before preparing signature requests." };
  }
  if (agents.length > 1) {
    return { kind: "error" as const, message: "Choose an Agent before I prepare this signature request." };
  }
  return { kind: "ok" as const, agent: agents[0] };
}

async function resolvePolicy(organizationId: string, agentId: string, policyId?: string) {
  const include = {
    agent: { select: { status: true } },
    ikaDwallet: { select: { state: true, id: true } },
  };
  if (policyId) {
    const policy = await prisma.guardedPolicy.findFirst({
      where: { id: policyId, organizationId, agentId },
      include,
    });
    if (!policy) return { kind: "error" as const, message: "I could not find that mandate for this Agent." };
    return { kind: "ok" as const, policy };
  }

  const policies = await prisma.guardedPolicy.findMany({
    where: { organizationId, agentId, status: "active" },
    include,
    take: 2,
  });
  if (policies.length === 0) {
    return { kind: "error" as const, message: "Create an active Mandate for this Agent before preparing signature requests." };
  }
  if (policies.length > 1) {
    return { kind: "error" as const, message: "Choose a Mandate before I preview this request." };
  }
  return { kind: "ok" as const, policy: policies[0] };
}

function buildScopeRefusal(_message: string, category: string): string {
  const base = "I can only help with Mandara agents, mandates, signature requests, SDK/API setup, webhooks, audit logs, and devnet beta troubleshooting.";
  if (category === "unrelated_school_work") {
    return `${base}\n\nI cannot write essays or do homework. Try: "Explain this agent's mandate."`;
  }
  if (category === "unrelated_coding") {
    return `${base}\n\nI cannot debug code or build apps. Try: "How do I connect a real agent using the SDK?"`;
  }
  if (category === "trading_advice") {
    return `${base}\n\nI cannot provide trading or investment advice. Try: "Can this agent request 150 USDC?"`;
  }
  if (category === "professional_advice") {
    return `${base}\n\nI cannot provide legal, medical, or financial advice. Try: "Prepare a 42 USDC payout to the approved Base Sepolia recipient."`;
  }
  if (category === "jailbreak") {
    return `${base}\n\nPrompt injection attempts are not allowed.`;
  }
  if (category === "secret_or_bypass_request") {
    return `${base}\n\nRequests involving secrets, private keys, service wallets, or bypassing mandates are not allowed.`;
  }
  return `${base}\n\nTry: "Prepare a 42 USDC payout to the approved Base Sepolia recipient."`;
}

function buildInformationalAnswer(message: string, intent: AgentIntentExtractionResult) {
  const lower = message.toLowerCase();
  if (lower.includes("mandate")) {
    return "A Mandate defines what a Mandara Agent may request: allowed chain, asset, recipient, and spend limits. I can prepare a signature request proposal and preview it against the Mandate, but only you can approve or reject it.";
  }
  if (lower.includes("devnet") || lower.includes("beta") || lower.includes("pre-alpha")) {
    return "Devnet beta means this is a test environment on Solana devnet. Ika is pre-alpha with a mock signer. This is not for real assets and not production custody.";
  }
  if (lower.includes("reject") || lower.includes("rejected") || lower.includes("why")) {
    return "A request is rejected when it does not match the current mandate. Common reasons: amount too high, wrong asset or recipient, mandate frozen or expired, or daily/total limits exceeded. You can update the mandate or change the request.";
  }
  if (lower.includes("connect") || lower.includes("sdk") || lower.includes("api")) {
    return "Your real AI agent connects to Mandara using the Connection Key and the @mandara/sdk. The SDK lets your agent preview requests against mandates and create signature requests. See the Agent Connection Guide for details.";
  }
  if (lower.includes("status")) {
    return "You can view the latest signature request status on the Requests page. Statuses include: Waiting, Queued, Processing, Approved by mandate, Waiting for Ika signature, Signed, Rejected by mandate, and Failed.";
  }
  return intent.explanation || "I can help prepare signature request proposals and explain mandate results.";
}

function buildMissingFieldsMessage(missingFields: string[], structuredInput: Record<string, unknown>): string {
  const fieldLabels: Record<string, string> = {
    destinationChainId: "the chain",
    asset: "the asset",
    recipient: "the recipient",
    amount: "the amount",
    message: "a message",
  };
  const labels = missingFields.map((f) => fieldLabels[f] ?? f).join(", ");

  // If amount is the only missing field, be more conversational
  if (missingFields.length === 1 && missingFields[0] === "amount") {
    return `What amount should I use? (e.g., 42 USDC)`;
  }
  if (missingFields.length === 1 && missingFields[0] === "recipient") {
    return `Which recipient should I use? You can say "the approved recipient" if your mandate has one.`;
  }
  if (missingFields.length === 1 && missingFields[0] === "asset") {
    return `What asset should I use? (e.g., USDC:BASE_SEPOLIA)`;
  }
  if (missingFields.length === 1 && missingFields[0] === "destinationChainId") {
    return `Which chain should I use? (e.g., Base Sepolia)`;
  }

  return `I need ${labels} before I can preview this signature request.`;
}

function buildProposalMessage(allowed: boolean, reason: string): string {
  if (allowed) {
    return "This request is allowed by the current mandate. You still need to approve before Mandara creates the request. Review the card and choose Approve & Create Request, or Approve, Create & Enqueue if you want the worker to process it immediately.";
  }
  return `This request is rejected by the current mandate: ${reason}. You can reject the proposal, update the mandate, or change the request.`;
}

async function createAssistantMessage(
  sessionId: string,
  content: string,
  input?: {
    metadata?: Record<string, unknown>;
    provider?: string;
    model?: string;
    scopeAllowed?: boolean;
    scopeReason?: string;
  }
) {
  return prisma.agentChatMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content,
      provider: input?.provider,
      model: input?.model,
      scopeAllowed: input?.scopeAllowed,
      scopeReason: input?.scopeReason,
      metadata: input?.metadata as Prisma.JsonObject,
    },
  });
}

async function createToolMessage(sessionId: string, content: string, metadata?: Record<string, unknown>) {
  return prisma.agentChatMessage.create({
    data: {
      sessionId,
      role: "tool",
      content,
      metadata: metadata as Prisma.JsonObject,
    },
  });
}

export async function loadSession(sessionId: string) {
  return prisma.agentChatSession.findUnique({
    where: { id: sessionId },
    include: {
      agent: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
      proposals: {
        orderBy: { createdAt: "desc" },
        include: {
          agent: { select: { id: true, name: true } },
          policy: { select: { id: true, name: true } },
          signingRequest: { select: { id: true, requestId: true, status: true } },
        },
      },
    },
  });
}
