import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { Prisma } from "@prisma/client";
import {
  PreviewSigningRequestSchema,
  CreateSigningRequestSchema,
  evaluateSigningRequest,
  PolicyRejectionCode,
} from "@mandara/core";
import { success, errorResponse } from "../lib/response.js";
import { recordAuditEvent } from "../lib/audit.js";
import { resolveOrganizationContext } from "../lib/orgContext.js";

const ListSigningRequestsQuery = z.object({
  orgId: z.string().cuid2().optional(),
  agentId: z.string().cuid2().optional(),
  policyId: z.string().cuid2().optional(),
  status: z.enum(["requested", "policy_rejected", "guard_approved", "ika_pending", "signed", "failed"]).optional(),
  limit: z.string().default("50").transform(Number),
});

export default async function signingRequestRoutes(fastify: FastifyInstance) {
  fastify.get("/api/signing-requests", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const query = ListSigningRequestsQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
    }

    const { orgId, agentId, policyId, status, limit } = query.data;
    const where: Record<string, unknown> = {};
    if (orgId) where.organizationId = orgId;
    if (agentId) where.agentId = agentId;
    if (policyId) where.policyId = policyId;
    if (status) where.status = status;

    const requests = await prisma.signingRequest.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true } },
        policy: { select: { id: true, name: true, onChainPda: true } },
        messageApproval: {
          select: {
            id: true,
            onChainPda: true,
            status: true,
            signatureLength: true,
            signatureHex: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(requests);
  });

  fastify.get("/api/signing-requests/:id", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };
    const signingRequest = await prisma.signingRequest.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, name: true } },
        policy: { select: { id: true, name: true, onChainPda: true } },
        ikaDwallet: { select: { id: true, name: true, onChainPda: true } },
        messageApproval: true,
      },
    });

    if (!signingRequest) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Signing request not found"));
    }

    return success(signingRequest);
  });

  fastify.post("/api/signing-requests/preview", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const parse = PreviewSigningRequestSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(
        errorResponse(
          "VALIDATION_ERROR",
          parse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        )
      );
    }

    const {
      organizationId: explicitOrgId,
      agentId,
      policyId,
      destinationChainId,
      asset,
      recipient,
      amount,
      message,
    } = parse.data;

    const { organizationId } = await resolveOrganizationContext(request, explicitOrgId);

    const policy = await prisma.guardedPolicy.findFirst({
      where: { id: policyId, organizationId, agentId },
      include: {
        agent: { select: { status: true } },
        ikaDwallet: { select: { state: true } },
      },
    });

    if (!policy) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Policy not found for this agent and organization"));
    }

    const evaluation = evaluateSigningRequest(
      {
        ...policy,
        perTxLimit: policy.perTxLimit.toString(),
        dailyLimit: policy.dailyLimit.toString(),
        totalLimit: policy.totalLimit.toString(),
      },
      {
        destinationChainId,
        asset,
        recipient,
        amount,
        message,
      }
    );

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "signing_request_previewed",
      resourceType: "policy",
      resourceId: policy.id,
      summary: `Previewed signing request: ${evaluation.allowed ? "allowed" : "rejected"}`,
      metadata: { allowed: evaluation.allowed, rejectionCode: evaluation.rejectionCode },
    });

    return success(evaluation);
  });

  fastify.post("/api/signing-requests", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const parse = CreateSigningRequestSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(
        errorResponse(
          "VALIDATION_ERROR",
          parse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        )
      );
    }

    const {
      organizationId: explicitOrgId,
      agentId,
      policyId,
      destinationChainId,
      asset,
      recipient,
      amount,
      message,
      persistIfRejected,
    } = parse.data;

    const { organizationId } = await resolveOrganizationContext(request, explicitOrgId);

    const policy = await prisma.guardedPolicy.findFirst({
      where: { id: policyId, organizationId, agentId },
      include: {
        agent: { select: { status: true } },
        ikaDwallet: { select: { state: true, id: true } },
      },
    });

    if (!policy) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Policy not found for this agent and organization"));
    }

    const evaluation = evaluateSigningRequest(
      {
        ...policy,
        perTxLimit: policy.perTxLimit.toString(),
        dailyLimit: policy.dailyLimit.toString(),
        totalLimit: policy.totalLimit.toString(),
      },
      {
        destinationChainId,
        asset,
        recipient,
        amount,
        message,
      }
    );

    if (evaluation.allowed) {
      const requestId = crypto.randomUUID().replace(/-/g, "");
      const sigReq = await prisma.signingRequest.create({
        data: {
          organizationId,
          agentId,
          policyId,
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
            nextStep: "Awaiting worker execution in P4",
          } as unknown as Prisma.JsonObject,
        },
      });

      await recordAuditEvent({
        organizationId,
        actorType: "user",
        actorId: user.id,
        eventType: "signing_request_created",
        resourceType: "signing_request",
        resourceId: sigReq.id,
        summary: `Created signing request ${requestId}`,
        metadata: { requestId, allowed: true },
      });

      return reply.status(201).send(
        success({
          signingRequest: sigReq,
          evaluation,
          nextStep: "Awaiting worker execution in P4",
        })
      );
    }

    // Rejected
    if (persistIfRejected) {
      const requestId = crypto.randomUUID().replace(/-/g, "");
      const sigReq = await prisma.signingRequest.create({
        data: {
          organizationId,
          agentId,
          policyId,
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
          status: "policy_rejected",
          rejectionReason: evaluation.reason,
          metadata: {
            evaluation,
          } as unknown as Prisma.JsonObject,
        },
      });

      await recordAuditEvent({
        organizationId,
        actorType: "user",
        actorId: user.id,
        eventType: "signing_request_policy_rejected",
        resourceType: "signing_request",
        resourceId: sigReq.id,
        summary: `Signing request ${requestId} rejected by policy`,
        metadata: { requestId, rejectionCode: evaluation.rejectionCode },
      });

      return reply.status(201).send(
        success({
          signingRequest: sigReq,
          evaluation,
        })
      );
    }

    // Not persisting — record preview audit and return 422
    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "signing_request_previewed",
      resourceType: "policy",
      resourceId: policy.id,
      summary: `Signing request rejected by policy (not persisted)`,
      metadata: { allowed: false, rejectionCode: evaluation.rejectionCode },
    });

    return reply.status(422).send(
      errorResponse("POLICY_REJECTED", evaluation.reason, {
        evaluation,
      })
    );
  });
}
