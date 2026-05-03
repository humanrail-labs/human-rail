import type { FastifyInstance } from "fastify";
import { prisma } from "@mandara/db";
import { Prisma } from "@prisma/client";
import {
  ExternalSignatureRequestInputSchema,
  evaluateSigningRequest,
} from "@mandara/core";
import { success, errorResponse } from "../../lib/response.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { authenticateAgentApiKey, recordAgentApiKeyUsed } from "../../plugins/agentAuth.js";
import { enqueueSigningRequest } from "../../services/queue.js";

export default async function v1SignatureRequestRoutes(fastify: FastifyInstance) {
  // ── Agent Status ──
  fastify.get("/v1/agent/status", {
    preHandler: [authenticateAgentApiKey],
    handler: async (request, reply) => {
      const auth = request.agentAuth!;

      const agent = await prisma.agent.findUnique({
        where: { id: auth.agentId },
        include: {
          guardedPolicies: {
            where: { status: "active" },
            select: { id: true },
          },
          _count: {
            select: {
              signingRequests: true,
            },
          },
        },
      });

      if (!agent) {
        return reply.status(404).send(errorResponse("NOT_FOUND", "Agent not found"));
      }

      const signedCount = await prisma.signingRequest.count({
        where: { agentId: auth.agentId, status: "signed" },
      });

      return success({
        agent: {
          id: agent.id,
          name: agent.name,
          status: agent.status,
        },
        organization: {
          id: agent.organizationId,
        },
        activePolicies: agent.guardedPolicies.length,
        signingRequests: {
          total: agent._count.signingRequests,
          signed: signedCount,
        },
      });
    },
  });

  // ── Preview Signature Request ──
  fastify.post("/v1/signature-requests/preview", {
    preHandler: [authenticateAgentApiKey],
    handler: async (request, reply) => {
      const auth = request.agentAuth!;

      const parse = ExternalSignatureRequestInputSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send(
          errorResponse(
            "VALIDATION_ERROR",
            parse.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join("; ")
          )
        );
      }

      const { destinationChainId, asset, recipient, amount, message, policyId } = parse.data;

      const resolved = await resolvePolicy(auth.organizationId, auth.agentId, policyId);
      if (!resolved) {
        return reply.status(404).send(errorResponse("NOT_FOUND", "Policy not found"));
      }
      if (resolved.ambiguous) {
        return reply.status(400).send(
          errorResponse(
            "POLICY_AMBIGUOUS",
            "Multiple active policies found. Provide policyId to disambiguate."
          )
        );
      }
      const policy = resolved.policy;

      const evaluation = evaluateSigningRequest(
        {
          ...policy,
          perTxLimit: policy.perTxLimit.toString(),
          dailyLimit: policy.dailyLimit.toString(),
          totalLimit: policy.totalLimit.toString(),
        },
        { destinationChainId, asset, recipient, amount, message }
      );

      await recordAuditEvent({
        organizationId: auth.organizationId,
        actorType: "agent",
        actorId: auth.agentId,
        eventType: "signing_request_previewed",
        resourceType: "policy",
        resourceId: policy.id,
        summary: `Agent previewed signing request: ${evaluation.allowed ? "allowed" : "rejected"}`,
        metadata: { allowed: evaluation.allowed, rejectionCode: evaluation.rejectionCode },
      });

      await recordAgentApiKeyUsed(request, { action: "preview", allowed: evaluation.allowed });

      return success({
        policyDecision: evaluation,
        messageDigest: evaluation.computed.messageDigest,
      });
    },
  });

  // ── Create Signature Request ──
  fastify.post("/v1/signature-requests", {
    preHandler: [authenticateAgentApiKey],
    handler: async (request, reply) => {
      const auth = request.agentAuth!;

      const parse = ExternalSignatureRequestInputSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send(
          errorResponse(
            "VALIDATION_ERROR",
            parse.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join("; ")
          )
        );
      }

      const {
        destinationChainId,
        asset,
        recipient,
        amount,
        message,
        policyId,
        enqueue,
        idempotencyKey,
      } = parse.data;

      const resolved = await resolvePolicy(auth.organizationId, auth.agentId, policyId);
      if (!resolved) {
        return reply.status(404).send(errorResponse("NOT_FOUND", "Policy not found"));
      }
      if (resolved.ambiguous) {
        return reply.status(400).send(
          errorResponse(
            "POLICY_AMBIGUOUS",
            "Multiple active policies found. Provide policyId to disambiguate."
          )
        );
      }
      const policy = resolved.policy;

      const evaluation = evaluateSigningRequest(
        {
          ...policy,
          perTxLimit: policy.perTxLimit.toString(),
          dailyLimit: policy.dailyLimit.toString(),
          totalLimit: policy.totalLimit.toString(),
        },
        { destinationChainId, asset, recipient, amount, message }
      );

      if (!evaluation.allowed) {
        await recordAuditEvent({
          organizationId: auth.organizationId,
          actorType: "agent",
          actorId: auth.agentId,
          eventType: "signing_request_previewed",
          resourceType: "policy",
          resourceId: policy.id,
          summary: `Agent signing request rejected by policy (not persisted)`,
          metadata: { allowed: false, rejectionCode: evaluation.rejectionCode },
        });

        await recordAgentApiKeyUsed(request, {
          action: "create",
          allowed: false,
          rejectionCode: evaluation.rejectionCode,
        });

        return reply.status(422).send(
          errorResponse("POLICY_REJECTED", evaluation.reason, {
            policyDecision: evaluation,
            messageDigest: evaluation.computed.messageDigest,
          })
        );
      }

      // Create signing request
      const requestId = crypto.randomUUID().replace(/-/g, "");
      const sigReq = await prisma.signingRequest.create({
        data: {
          organizationId: auth.organizationId,
          agentId: auth.agentId,
          policyId: policy.id,
          ikaDwalletId: policy.ikaDwallet?.id ?? null,
          requestId,
          messageDigest: `0x${evaluation.computed.messageDigest}`,
          messageMetadataDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
          destinationChainId,
          asset: asset.trim().toUpperCase(),
          recipient: recipient.trim().toLowerCase(),
          assetHash: evaluation.computed.assetHash,
          recipientHash: evaluation.computed.recipientHash,
          amount,
          message,
          signatureScheme: "EcdsaKeccak256",
          status: "requested",
          metadata: {
            evaluation,
            nextStep: "Awaiting worker execution",
            idempotencyKey: idempotencyKey ?? undefined,
          } as unknown as Prisma.JsonObject,
        },
      });

      await recordAuditEvent({
        organizationId: auth.organizationId,
        actorType: "agent",
        actorId: auth.agentId,
        eventType: "signing_request_created",
        resourceType: "signing_request",
        resourceId: sigReq.id,
        summary: `Agent created signing request ${requestId}`,
        metadata: { requestId, allowed: true },
      });

      let execution:
        | { jobId: string | undefined; queue: string; status: string }
        | undefined;

      if (enqueue) {
        const job = await enqueueSigningRequest({
          signingRequestId: sigReq.id,
          organizationId: auth.organizationId,
          requestedBy: auth.agentId,
        });

        await prisma.signingRequest.update({
          where: { id: sigReq.id },
          data: {
            status: "queued",
            executionJobId: job.id ?? null,
          },
        });

        await recordAuditEvent({
          organizationId: auth.organizationId,
          actorType: "agent",
          actorId: auth.agentId,
          eventType: "signing_request_queued",
          resourceType: "signing_request",
          resourceId: sigReq.id,
          summary: `Agent enqueued signing request ${requestId}`,
          metadata: { jobId: job.id, queue: "mandara.signing-requests" },
        });

        execution = {
          jobId: job.id,
          queue: "mandara.signing-requests",
          status: "queued",
        };
      }

      await recordAgentApiKeyUsed(request, {
        action: "create",
        allowed: true,
        enqueued: !!enqueue,
      });

      return reply.status(201).send(
        success({
          id: sigReq.id,
          status: enqueue ? "queued" : "requested",
          policyDecision: evaluation,
          execution,
          messageDigest: evaluation.computed.messageDigest,
          signingRequest: {
            id: sigReq.id,
            requestId: sigReq.requestId,
            status: enqueue ? "queued" : "requested",
          },
        })
      );
    },
  });

  // ── Get Signature Request ──
  fastify.get("/v1/signature-requests/:id", {
    preHandler: [authenticateAgentApiKey],
    handler: async (request, reply) => {
      const auth = request.agentAuth!;
      const { id } = request.params as { id: string };

      const sigReq = await prisma.signingRequest.findFirst({
        where: { id, agentId: auth.agentId },
        include: {
          policy: { select: { id: true, name: true } },
          messageApproval: {
            select: {
              status: true,
              signatureHex: true,
              signatureBase64: true,
            },
          },
        },
      });

      if (!sigReq) {
        return reply.status(404).send(errorResponse("NOT_FOUND", "Signing request not found"));
      }

      return success({
        id: sigReq.id,
        requestId: sigReq.requestId,
        status: sigReq.status,
        destinationChainId: sigReq.destinationChainId,
        asset: sigReq.asset,
        recipient: sigReq.recipient,
        amount: sigReq.amount.toString(),
        message: sigReq.message,
        messageDigest: sigReq.messageDigest,
        executionJobId: sigReq.executionJobId,
        signature: sigReq.messageApproval?.signatureHex ?? null,
        messageApproval: sigReq.messageApproval
          ? {
              status: sigReq.messageApproval.status,
              signatureHex: sigReq.messageApproval.signatureHex,
            }
          : null,
        nextStep:
          sigReq.status === "signed"
            ? "completed"
            : sigReq.status === "queued"
              ? "awaiting_worker"
              : sigReq.status === "policy_rejected"
                ? "rejected"
                : "awaiting_execution",
      });
    },
  });
}

// ── Helpers ──

interface ResolvedPolicy {
  policy: Awaited<ReturnType<typeof prisma.guardedPolicy.findFirst>> & {
    agent: { status: string };
    ikaDwallet: { state: string; id: string } | null;
  };
  ambiguous: boolean;
}

async function resolvePolicy(
  organizationId: string,
  agentId: string,
  explicitPolicyId?: string
): Promise<ResolvedPolicy | null> {
  if (explicitPolicyId) {
    const p = await prisma.guardedPolicy.findFirst({
      where: { id: explicitPolicyId, organizationId, agentId },
      include: {
        agent: { select: { status: true } },
        ikaDwallet: { select: { state: true, id: true } },
      },
    });
    if (!p) return null;
    return { policy: p as ResolvedPolicy["policy"], ambiguous: false };
  }

  const policies = await prisma.guardedPolicy.findMany({
    where: { organizationId, agentId, status: "active" },
    include: {
      agent: { select: { status: true } },
      ikaDwallet: { select: { state: true, id: true } },
    },
    take: 2,
  });

  if (policies.length === 0) {
    return null;
  }

  if (policies.length > 1) {
    return { policy: policies[0] as ResolvedPolicy["policy"], ambiguous: true };
  }

  return { policy: policies[0] as ResolvedPolicy["policy"], ambiguous: false };
}
