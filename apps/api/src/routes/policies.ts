import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { CreatePolicySchema } from "@mandara/core";
import { computePolicyHashes } from "@mandara/core";
import { success, errorResponse } from "../lib/response.js";
import { recordAuditEvent } from "../lib/audit.js";
import { resolveOrganizationContext } from "../lib/orgContext.js";

const ListPoliciesQuery = z.object({
  orgId: z.string().cuid2().optional(),
  agentId: z.string().cuid2().optional(),
  status: z.enum(["active", "frozen", "expired", "revoked"]).optional(),
  limit: z.string().default("50").transform(Number),
});

export default async function policyRoutes(fastify: FastifyInstance) {
  fastify.get("/api/policies", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const query = ListPoliciesQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
    }

    const { orgId, agentId, status, limit } = query.data;
    const where: Record<string, unknown> = {};
    if (orgId) where.organizationId = orgId;
    if (agentId) where.agentId = agentId;
    if (status) where.status = status;

    const policies = await prisma.guardedPolicy.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true } },
        ikaDwallet: { select: { id: true, name: true, onChainPda: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(policies);
  });

  fastify.post("/api/policies", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const parse = CreatePolicySchema.safeParse(request.body);
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
      ikaDwalletId,
      name,
      chainId,
      asset,
      recipient,
      perTxLimit,
      dailyLimit,
      totalLimit,
      expiresAt,
    } = parse.data;

    const { organizationId } = await resolveOrganizationContext(request, explicitOrgId);

    // Verify agent belongs to org
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, organizationId },
    });
    if (!agent) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Agent not found in this organization"));
    }

    // Verify wallet belongs to org
    const wallet = await prisma.ikaDwallet.findFirst({
      where: { id: ikaDwalletId, organizationId },
    });
    if (!wallet) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Wallet not found in this organization"));
    }

    // Validate limits
    const ptx = BigInt(perTxLimit);
    const dl = BigInt(dailyLimit);
    if (ptx <= BigInt(0)) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "perTxLimit must be greater than zero"));
    }
    if (dl <= BigInt(0)) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "dailyLimit must be greater than zero"));
    }
    if (ptx > dl) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "perTxLimit cannot exceed dailyLimit"));
    }
    if (totalLimit && BigInt(totalLimit) > BigInt(0) && dl > BigInt(totalLimit)) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "dailyLimit cannot exceed totalLimit"));
    }

    // Compute hashes
    const assetNorm = asset.trim().toUpperCase();
    const recipientNorm = recipient.trim().toLowerCase();
    const { assetHash, recipientHash } = computePolicyHashes(assetNorm, recipientNorm);

    const policy = await prisma.guardedPolicy.create({
      data: {
        organizationId,
        agentId,
        ikaDwalletId,
        name: name ?? `${assetNorm} Policy`,
        allowedChainId: chainId,
        allowedAsset: assetNorm,
        allowedRecipient: recipientNorm,
        allowedAssetHash: assetHash,
        allowedRecipientHash: recipientHash,
        perTxLimit,
        dailyLimit,
        totalLimit: totalLimit ?? "0",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: "active",
      },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "guarded_policy_created",
      resourceType: "policy",
      resourceId: policy.id,
      summary: `Created policy ${policy.name}`,
      metadata: { allowedChainId: chainId, asset: assetNorm, recipient: recipientNorm },
    });

    return reply.status(201).send(success(policy));
  });
}
