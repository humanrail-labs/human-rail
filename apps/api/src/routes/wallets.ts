import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { Prisma } from "@prisma/client";
import { ImportIkaDwalletSchema } from "@mandara/core";
import { IKA_PROGRAM_IDS } from "@mandara/core";
import { success, errorResponse } from "../lib/response.js";
import { recordAuditEvent } from "../lib/audit.js";
import { resolveOrganizationContext } from "../lib/orgContext.js";

const ListWalletsQuery = z.object({
  orgId: z.string().cuid2().optional(),
  state: z.string().optional(),
  limit: z.string().default("50").transform(Number),
});

export default async function walletRoutes(fastify: FastifyInstance) {
  fastify.get("/api/wallets", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const query = ListWalletsQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
    }

    const { orgId, state, limit } = query.data;
    const effectiveOrgId = orgId ?? user.organizationIds[0];
    if (!effectiveOrgId || !user.organizationIds.includes(effectiveOrgId)) {
      return reply.status(403).send(errorResponse("FORBIDDEN", "Not a member of this organization"));
    }

    const where: Record<string, unknown> = { organizationId: effectiveOrgId };
    if (state) where.state = state;

    const wallets = await prisma.ikaDwallet.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(wallets);
  });

  fastify.post("/api/wallets/import", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const parse = ImportIkaDwalletSchema.safeParse(request.body);
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
      name,
      dwalletPda,
      signingPublicKey,
      curve,
      authority,
      state,
      ikaProgramId,
      guardCpiAuthority,
      authorityTransferSignature,
      metadata: inputMetadata,
    } = parse.data;

    const { organizationId } = await resolveOrganizationContext(request, explicitOrgId);

    const metadata: Record<string, unknown> = {
      source: "imported",
      ...(inputMetadata ?? {}),
    };
    if (guardCpiAuthority) metadata.guardCpiAuthority = guardCpiAuthority;
    if (authorityTransferSignature) metadata.authorityTransferSignature = authorityTransferSignature;
    if (ikaProgramId) metadata.ikaProgramId = ikaProgramId;

    const wallet = await prisma.ikaDwallet.upsert({
      where: { onChainPda: dwalletPda },
      update: {
        name: name ?? undefined,
        publicKey: signingPublicKey ?? undefined,
        curve,
        state: state ?? "Active",
        authority: authority ?? undefined,
        metadata: metadata as Prisma.InputJsonValue,
      },
      create: {
        organizationId,
        name: name ?? "Imported Ika dWallet",
        onChainPda: dwalletPda,
        publicKey: signingPublicKey,
        curve,
        state: state ?? "Active",
        authority,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "ika_dwallet_imported",
      resourceType: "wallet",
      resourceId: wallet.id,
      summary: `Imported Ika dWallet ${dwalletPda}`,
      metadata: { onChainPda: dwalletPda, source: "imported" },
    });

    return reply.status(201).send(success(wallet));
  });
}
