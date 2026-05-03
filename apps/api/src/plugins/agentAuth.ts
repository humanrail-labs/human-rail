import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@mandara/db";
import { verifyAgentApiKey, getAgentApiKeyPrefix } from "../lib/apiKeys.js";
import { recordAuditEvent } from "../lib/audit.js";
import { errorResponse } from "../lib/response.js";

export interface AgentAuthContext {
  organizationId: string;
  agentId: string;
  apiKeyId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    agentAuth?: AgentAuthContext;
  }
}

export default fp(async function agentAuthPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest("agentAuth", undefined);
});

/**
 * Fastify preHandler that authenticates requests via Authorization: Bearer <key>.
 * Sets request.agentAuth on success, returns 401/403 on failure.
 */
export async function authenticateAgentApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing or invalid Authorization header. Expected: Bearer <api-key>"));
    return;
  }

  const rawKey = authHeader.slice(7).trim();
  const prefix = getAgentApiKeyPrefix(rawKey);

  if (!prefix || !rawKey.startsWith("mandara_dev_")) {
    reply.status(401).send(errorResponse("UNAUTHORIZED", "Invalid API key format"));
    return;
  }

  const apiKeyRecord = await prisma.agentApiKey.findFirst({
    where: { prefix },
    include: {
      agent: { include: { organization: true } },
    },
  });

  if (!apiKeyRecord) {
    reply.status(401).send(errorResponse("UNAUTHORIZED", "Invalid API key"));
    return;
  }

  if (apiKeyRecord.revokedAt) {
    reply.status(401).send(errorResponse("UNAUTHORIZED", "API key has been revoked"));
    return;
  }

  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt.getTime() < Date.now()) {
    reply.status(401).send(errorResponse("UNAUTHORIZED", "API key has expired"));
    return;
  }

  if (!verifyAgentApiKey(rawKey, apiKeyRecord.hash)) {
    reply.status(401).send(errorResponse("UNAUTHORIZED", "Invalid API key"));
    return;
  }

  if (apiKeyRecord.agent.status !== "active") {
    reply.status(403).send(errorResponse("FORBIDDEN", "Agent is not active"));
    return;
  }

  // Update lastUsedAt (fire-and-forget, don't block request)
  prisma.agentApiKey
    .update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  request.agentAuth = {
    organizationId: apiKeyRecord.agent.organizationId,
    agentId: apiKeyRecord.agentId,
    apiKeyId: apiKeyRecord.id,
  };
}

/**
 * Record agent_api_key_used audit event.
 * Call this from routes that perform substantive actions (create/preview signing requests).
 * Avoid calling on simple GET/status endpoints to reduce audit spam.
 */
export async function recordAgentApiKeyUsed(
  request: FastifyRequest,
  metadata?: Record<string, unknown>
): Promise<void> {
  const auth = request.agentAuth;
  if (!auth) return;

  await recordAuditEvent({
    organizationId: auth.organizationId,
    actorType: "agent",
    actorId: auth.agentId,
    eventType: "agent_api_key_used",
    resourceType: "api_key",
    resourceId: auth.apiKeyId,
    summary: "Agent API key used for external request",
    metadata,
  });
}
