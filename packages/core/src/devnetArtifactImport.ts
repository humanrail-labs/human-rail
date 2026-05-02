import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  MANDARA_DEVNET_ARTIFACTS,
  MANDARA_DEMO_ORG_NAME,
  MANDARA_DEMO_AGENT_NAME,
  MANDARA_DEMO_POLICY_NAME,
} from "./constants/devnetArtifacts.js";
import { IKA_PRE_ALPHA_DISCLAIMER } from "./constants/ika.js";

export interface ImportSummary {
  organizationId: string;
  agentId: string;
  ikaDwalletId: string;
  guardedPolicyId: string;
  signingRequestId: string;
  messageApprovalId: string;
  createdCounts: Record<string, number>;
  updatedCounts: Record<string, number>;
}

export interface ImportOptions {
  prisma: PrismaClient;
  importedByUserId?: string;
  source?: string;
}

export async function importMandaraDevnetArtifacts(
  opts: ImportOptions
): Promise<ImportSummary> {
  const { prisma, importedByUserId = "system", source = "devnet-artifacts" } = opts;

  const created: Record<string, number> = {};
  const updated: Record<string, number> = {};

  function inc(type: string, mode: "created" | "updated") {
    const map = mode === "created" ? created : updated;
    map[type] = (map[type] ?? 0) + 1;
  }

  const artifacts = MANDARA_DEVNET_ARTIFACTS;

  // ── Organization ──
  const orgSlug = "mandara-devnet-demo";
  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: {},
    create: {
      slug: orgSlug,
      name: MANDARA_DEMO_ORG_NAME,
      tier: "free",
    },
  });
  const isNewOrg = org.createdAt.getTime() > Date.now() - 5000;
  inc("organization", isNewOrg ? "created" : "updated");

  // ── Dev User (upsert via externalId deterministic) ──
  const devEmail = "dev@local";
  const devExternalId = `dev_${Buffer.from(devEmail).toString("base64url")}`;
  const user = await prisma.user.upsert({
    where: { externalId: devExternalId },
    update: {},
    create: {
      externalId: devExternalId,
      email: devEmail,
      displayName: "Dev User",
    },
  });

  // ── Membership ──
  await prisma.membership.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: user.id },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "owner",
    },
  });

  // ── Agent ──
  // Upsert by org + name since we don't have a reliable on-chain agent PDA for the demo
  let agent = await prisma.agent.findFirst({
    where: { organizationId: org.id, name: MANDARA_DEMO_AGENT_NAME },
  });
  if (!agent) {
    agent = await prisma.agent.create({
      data: {
        organizationId: org.id,
        name: MANDARA_DEMO_AGENT_NAME,
        description: "Demo agent for cross-chain treasury operations",
        status: "active",
      },
    });
    inc("agent", "created");
  } else {
    inc("agent", "updated");
  }

  // ── IkaDwallet ──
  const dwallet = await prisma.ikaDwallet.upsert({
    where: { onChainPda: artifacts.ikaDwallet.pda },
    update: {
      name: "Mandara Devnet dWallet",
      publicKey: artifacts.ikaDwallet.publicKeyHex,
      curve: artifacts.ikaDwallet.curve,
      state: artifacts.ikaDwallet.state,
      authority: artifacts.ikaDwallet.authority,
      metadata: {
        guardCpiAuthority: artifacts.guardCpiAuthority,
        authorityTransferSignature: artifacts.ikaDwallet.authorityTransferSignature,
        source,
        disclaimer: IKA_PRE_ALPHA_DISCLAIMER,
      } as Prisma.JsonObject,
    },
    create: {
      organizationId: org.id,
      name: "Mandara Devnet dWallet",
      onChainPda: artifacts.ikaDwallet.pda,
      publicKey: artifacts.ikaDwallet.publicKeyHex,
      curve: artifacts.ikaDwallet.curve,
      state: artifacts.ikaDwallet.state,
      authority: artifacts.ikaDwallet.authority,
      metadata: {
        guardCpiAuthority: artifacts.guardCpiAuthority,
        authorityTransferSignature: artifacts.ikaDwallet.authorityTransferSignature,
        source,
        disclaimer: IKA_PRE_ALPHA_DISCLAIMER,
      } as Prisma.JsonObject,
    },
  });
  const dwalletMode =
    dwallet.createdAt.getTime() > Date.now() - 5000 ? "created" : "updated";
  inc("ikaDwallet", dwalletMode);

  // ── GuardedPolicy ──
  const policy = await prisma.guardedPolicy.upsert({
    where: { onChainPda: artifacts.guardedPolicy.pda },
    update: {
      name: MANDARA_DEMO_POLICY_NAME,
      allowedChainId: artifacts.guardedPolicy.allowedChainId,
      allowedAsset: artifacts.guardedPolicy.asset,
      allowedRecipient: artifacts.guardedPolicy.recipient,
      allowedAssetHash: artifacts.guardedPolicy.assetHashHex,
      allowedRecipientHash: artifacts.guardedPolicy.recipientHashHex,
      perTxLimit: artifacts.guardedPolicy.perTxLimit,
      dailyLimit: artifacts.guardedPolicy.dailyLimit,
      totalLimit: artifacts.guardedPolicy.totalLimit,
      expiresAt: artifacts.guardedPolicy.expiresAt,
      status: "active",
      metadata: {
        humanrailGuardProgramId: artifacts.humanrailGuardProgramId,
        source,
      } as Prisma.JsonObject,
    },
    create: {
      organizationId: org.id,
      agentId: agent.id,
      ikaDwalletId: dwallet.id,
      name: MANDARA_DEMO_POLICY_NAME,
      onChainPda: artifacts.guardedPolicy.pda,
      allowedChainId: artifacts.guardedPolicy.allowedChainId,
      allowedAsset: artifacts.guardedPolicy.asset,
      allowedRecipient: artifacts.guardedPolicy.recipient,
      allowedAssetHash: artifacts.guardedPolicy.assetHashHex,
      allowedRecipientHash: artifacts.guardedPolicy.recipientHashHex,
      perTxLimit: artifacts.guardedPolicy.perTxLimit,
      dailyLimit: artifacts.guardedPolicy.dailyLimit,
      totalLimit: artifacts.guardedPolicy.totalLimit,
      expiresAt: artifacts.guardedPolicy.expiresAt,
      status: "active",
      metadata: {
        humanrailGuardProgramId: artifacts.humanrailGuardProgramId,
        source,
      } as Prisma.JsonObject,
    },
  });
  const policyMode =
    policy.createdAt.getTime() > Date.now() - 5000 ? "created" : "updated";
  inc("guardedPolicy", policyMode);

  // ── SigningRequest ──
  const signingReq = await prisma.signingRequest.upsert({
    where: { requestId: artifacts.signingRequest.requestIdHex },
    update: {
      messageDigest: artifacts.signingRequest.messageDigestHex,
      messageMetadataDigest: artifacts.signingRequest.messageMetadataDigestHex,
      destinationChainId: artifacts.signingRequest.destinationChainId,
      asset: artifacts.guardedPolicy.asset,
      recipient: artifacts.guardedPolicy.recipient,
      assetHash: artifacts.guardedPolicy.assetHashHex,
      recipientHash: artifacts.guardedPolicy.recipientHashHex,
      amount: artifacts.signingRequest.amount,
      message: artifacts.signingRequest.message,
      signatureScheme: artifacts.signingRequest.signatureScheme,
      status: "signed",
      onChainRequestPda: artifacts.signingRequest.guardSigningRequestPda,
      onChainMessageApprovalPda: artifacts.messageApproval.pda,
      approveTxSignature: artifacts.signingRequest.approveTxSignature,
      signedAt: artifacts.signingRequest.signedAt,
      signatureHex: artifacts.signingRequest.signatureHex,
      signatureBase64: artifacts.signingRequest.signatureBase64,
      metadata: { source } as Prisma.JsonObject,
    },
    create: {
      organizationId: org.id,
      agentId: agent.id,
      policyId: policy.id,
      ikaDwalletId: dwallet.id,
      requestId: artifacts.signingRequest.requestIdHex,
      messageDigest: artifacts.signingRequest.messageDigestHex,
      messageMetadataDigest: artifacts.signingRequest.messageMetadataDigestHex,
      destinationChainId: artifacts.signingRequest.destinationChainId,
      asset: artifacts.guardedPolicy.asset,
      recipient: artifacts.guardedPolicy.recipient,
      assetHash: artifacts.guardedPolicy.assetHashHex,
      recipientHash: artifacts.guardedPolicy.recipientHashHex,
      amount: artifacts.signingRequest.amount,
      message: artifacts.signingRequest.message,
      signatureScheme: artifacts.signingRequest.signatureScheme,
      status: "signed",
      onChainRequestPda: artifacts.signingRequest.guardSigningRequestPda,
      onChainMessageApprovalPda: artifacts.messageApproval.pda,
      approveTxSignature: artifacts.signingRequest.approveTxSignature,
      signedAt: artifacts.signingRequest.signedAt,
      signatureHex: artifacts.signingRequest.signatureHex,
      signatureBase64: artifacts.signingRequest.signatureBase64,
      metadata: { source } as Prisma.JsonObject,
    },
  });
  const signingMode =
    signingReq.createdAt.getTime() > Date.now() - 5000 ? "created" : "updated";
  inc("signingRequest", signingMode);

  // ── MessageApproval ──
  const msgApproval = await prisma.messageApproval.upsert({
    where: { onChainPda: artifacts.messageApproval.pda },
    update: {
      signingRequestId: signingReq.id,
      dwalletPda: artifacts.ikaDwallet.pda,
      messageDigest: artifacts.signingRequest.messageDigestHex,
      metadataDigest: artifacts.signingRequest.messageMetadataDigestHex,
      approver: artifacts.guardCpiAuthority,
      userPubkey: artifacts.ikaDwallet.publicKeyHex,
      signatureScheme: artifacts.signingRequest.signatureScheme,
      epoch: "0",
      status: "signed",
      signatureLength: artifacts.messageApproval.signatureLength,
      signatureHex: artifacts.messageApproval.signatureHex,
      signatureBase64: artifacts.messageApproval.signatureBase64,
      metadata: { source } as Prisma.JsonObject,
    },
    create: {
      organizationId: org.id,
      signingRequestId: signingReq.id,
      onChainPda: artifacts.messageApproval.pda,
      dwalletPda: artifacts.ikaDwallet.pda,
      messageDigest: artifacts.signingRequest.messageDigestHex,
      metadataDigest: artifacts.signingRequest.messageMetadataDigestHex,
      approver: artifacts.guardCpiAuthority,
      userPubkey: artifacts.ikaDwallet.publicKeyHex,
      signatureScheme: artifacts.signingRequest.signatureScheme,
      epoch: "0",
      status: "signed",
      signatureLength: artifacts.messageApproval.signatureLength,
      signatureHex: artifacts.messageApproval.signatureHex,
      signatureBase64: artifacts.messageApproval.signatureBase64,
      metadata: { source } as Prisma.JsonObject,
    },
  });
  const msgMode =
    msgApproval.createdAt.getTime() > Date.now() - 5000 ? "created" : "updated";
  inc("messageApproval", msgMode);

  // ── Audit Events (deduplicated) ──
  const auditSpecs: Array<{
    eventType:
      | "devnet_artifact_imported"
      | "ika_dwallet_imported"
      | "guarded_policy_imported"
      | "signing_request_imported"
      | "message_approval_imported";
    resourceType: string;
    resourceId: string;
    summary: string;
  }> = [
    {
      eventType: "devnet_artifact_imported",
      resourceType: "organization",
      resourceId: org.id,
      summary: `Imported devnet artifacts into org ${org.name}`,
    },
    {
      eventType: "ika_dwallet_imported",
      resourceType: "wallet",
      resourceId: dwallet.id,
      summary: `Imported Ika dWallet ${artifacts.ikaDwallet.pda}`,
    },
    {
      eventType: "guarded_policy_imported",
      resourceType: "policy",
      resourceId: policy.id,
      summary: `Imported GuardedPolicy ${artifacts.guardedPolicy.pda}`,
    },
    {
      eventType: "signing_request_imported",
      resourceType: "signing_request",
      resourceId: signingReq.id,
      summary: `Imported signing request ${artifacts.signingRequest.requestIdHex}`,
    },
    {
      eventType: "message_approval_imported",
      resourceType: "message_approval",
      resourceId: msgApproval.id,
      summary: `Imported MessageApproval ${artifacts.messageApproval.pda}`,
    },
  ];

  for (const spec of auditSpecs) {
    const existing = await prisma.auditEvent.findFirst({
      where: {
        organizationId: org.id,
        eventType: spec.eventType,
        resourceType: spec.resourceType,
        resourceId: spec.resourceId,
        metadata: {
          path: ["source"],
          equals: source,
        },
      },
    });
    if (!existing) {
      await prisma.auditEvent.create({
        data: {
          organizationId: org.id,
          actorType: "user",
          actorId: importedByUserId,
          eventType: spec.eventType,
          resourceType: spec.resourceType,
          resourceId: spec.resourceId,
          summary: spec.summary,
          metadata: { source } as Prisma.JsonObject,
        },
      });
      inc("auditEvent", "created");
    }
  }

  return {
    organizationId: org.id,
    agentId: agent.id,
    ikaDwalletId: dwallet.id,
    guardedPolicyId: policy.id,
    signingRequestId: signingReq.id,
    messageApprovalId: msgApproval.id,
    createdCounts: created,
    updatedCounts: updated,
  };
}
