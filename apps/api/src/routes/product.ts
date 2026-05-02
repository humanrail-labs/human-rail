import type { FastifyInstance } from "fastify";
import { prisma } from "@mandara/db";
import { success, errorResponse } from "../lib/response.js";
import {
  MANDARA_DEMO_ORG_NAME,
  MANDARA_DEVNET_ARTIFACTS,
  IKA_PRE_ALPHA_DISCLAIMER,
} from "@mandara/core";

export default async function productRoutes(fastify: FastifyInstance) {
  fastify.get("/api/product/devnet-demo", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const org = await prisma.organization.findUnique({
      where: { slug: "mandara-devnet-demo" },
      include: {
        agents: { take: 1 },
        ikaDwallets: { take: 1 },
        guardedPolicies: { take: 1 },
        signingRequests: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { messageApproval: true },
        },
      },
    });

    if (!org) {
      return success({
        lifecycleStatus: "missing",
        signed: false,
        preAlphaDisclaimer: IKA_PRE_ALPHA_DISCLAIMER,
      });
    }

    const agent = org.agents[0];
    const wallet = org.ikaDwallets[0];
    const policy = org.guardedPolicies[0];
    const signingRequest = org.signingRequests[0];
    const messageApproval = signingRequest?.messageApproval ?? null;

    const hasAll = !!(agent && wallet && policy && signingRequest && messageApproval);
    const isSigned = messageApproval?.status === "signed";

    return success({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      agent: agent
        ? { id: agent.id, name: agent.name, status: agent.status }
        : null,
      ikaDwallet: wallet
        ? {
            id: wallet.id,
            onChainPda: wallet.onChainPda,
            publicKey: wallet.publicKey,
            curve: wallet.curve,
            state: wallet.state,
            authority: wallet.authority,
          }
        : null,
      guardedPolicy: policy
        ? {
            id: policy.id,
            onChainPda: policy.onChainPda,
            allowedChainId: policy.allowedChainId,
            allowedAsset: policy.allowedAsset,
            allowedRecipient: policy.allowedRecipient,
            perTxLimit: policy.perTxLimit.toString(),
            dailyLimit: policy.dailyLimit.toString(),
            totalLimit: policy.totalLimit.toString(),
            status: policy.status,
          }
        : null,
      signingRequest: signingRequest
        ? {
            id: signingRequest.id,
            requestId: signingRequest.requestId,
            messageDigest: signingRequest.messageDigest,
            amount: signingRequest.amount.toString(),
            asset: signingRequest.asset,
            recipient: signingRequest.recipient,
            status: signingRequest.status,
            signatureHex: signingRequest.signatureHex,
            signatureBase64: signingRequest.signatureBase64,
            approveTxSignature: signingRequest.approveTxSignature,
          }
        : null,
      messageApproval: messageApproval
        ? {
            id: messageApproval.id,
            onChainPda: messageApproval.onChainPda,
            status: messageApproval.status,
            signatureLength: messageApproval.signatureLength,
            signatureHex: messageApproval.signatureHex,
            signatureBase64: messageApproval.signatureBase64,
          }
        : null,
      lifecycleStatus: hasAll ? (isSigned ? "imported" : "partial") : "partial",
      signed: isSigned,
      preAlphaDisclaimer: IKA_PRE_ALPHA_DISCLAIMER,
      publicArtifacts: {
        humanrailGuardProgramId: MANDARA_DEVNET_ARTIFACTS.humanrailGuardProgramId,
        ikaDwalletProgramId: MANDARA_DEVNET_ARTIFACTS.ikaDwalletProgramId,
        guardCpiAuthority: MANDARA_DEVNET_ARTIFACTS.guardCpiAuthority,
      },
    });
  });
}
