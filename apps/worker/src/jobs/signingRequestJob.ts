import { prisma } from "@mandara/db";
import { evaluateSigningRequest } from "@mandara/core";
import { env, isDryRun, isLiveDevnet, liveExecutionEnabled } from "../config.js";
import { logger } from "../lib/logger.js";
import { recordAuditEvent } from "../lib/audit.js";
import { updateSigningRequestStatus } from "../lib/status.js";
import type { SigningRequestJobData } from "../queues.js";

export async function processSigningRequestJob(data: SigningRequestJobData) {
  const { signingRequestId, organizationId, requestedBy } = data;

  // 1. Load signing request with relations
  const signingRequest = await prisma.signingRequest.findUnique({
    where: { id: signingRequestId },
    include: {
      policy: {
        include: {
          agent: { select: { status: true } },
          ikaDwallet: { select: { state: true } },
        },
      },
      agent: { select: { status: true } },
      ikaDwallet: { select: { state: true } },
      messageApproval: true,
    },
  });

  if (!signingRequest) {
    throw new Error(`Signing request ${signingRequestId} not found`);
  }

  // 2. Skip if already in terminal state
  const terminalStatuses = ["signed", "policy_rejected", "failed"] as const;
  if (terminalStatuses.includes(signingRequest.status as any)) {
    logger.warn("Skipping job: signing request is in terminal state", {
      signingRequestId,
      status: signingRequest.status,
    });
    await recordAuditEvent({
      organizationId,
      actorType: "worker",
      eventType: "signing_request_worker_skipped",
      resourceType: "signing_request",
      resourceId: signingRequestId,
      summary: `Worker skipped signing request ${signingRequestId}: already ${signingRequest.status}`,
      metadata: { status: signingRequest.status },
    });
    return { skipped: true, reason: `Already ${signingRequest.status}` };
  }

  // 3. Update status to worker_processing
  await updateSigningRequestStatus(signingRequestId, "worker_processing");
  await recordAuditEvent({
    organizationId,
    actorType: "worker",
    eventType: "signing_request_processing",
    resourceType: "signing_request",
    resourceId: signingRequestId,
    summary: `Worker started processing signing request ${signingRequestId}`,
  });

  // 4. Re-run policy evaluation
  const policy = signingRequest.policy;
  const evaluation = evaluateSigningRequest(
    {
      status: policy.status,
      allowedChainId: policy.allowedChainId,
      allowedAsset: policy.allowedAsset,
      allowedRecipient: policy.allowedRecipient,
      allowedAssetHash: policy.allowedAssetHash,
      allowedRecipientHash: policy.allowedRecipientHash,
      perTxLimit: policy.perTxLimit.toString(),
      dailyLimit: policy.dailyLimit.toString(),
      totalLimit: policy.totalLimit.toString(),
      expiresAt: policy.expiresAt,
      agent: policy.agent,
      ikaDwallet: policy.ikaDwallet,
    },
    {
      destinationChainId: signingRequest.destinationChainId,
      asset: signingRequest.asset ?? "",
      recipient: signingRequest.recipient ?? "",
      amount: signingRequest.amount.toString(),
      message: signingRequest.message ?? "",
    }
  );

  // 5. If evaluation fails, mark policy_rejected
  if (!evaluation.allowed) {
    logger.warn("Policy evaluation failed during worker processing", {
      signingRequestId,
      rejectionCode: evaluation.rejectionCode,
      reason: evaluation.reason,
    });
    await updateSigningRequestStatus(signingRequestId, "policy_rejected", {
      rejectionReason: evaluation.reason,
      metadata: {
        workerEvaluation: evaluation as unknown as Record<string, unknown>,
      },
    });
    await recordAuditEvent({
      organizationId,
      actorType: "worker",
      eventType: "signing_request_policy_rejected",
      resourceType: "signing_request",
      resourceId: signingRequestId,
      summary: `Worker rejected signing request ${signingRequestId}: ${evaluation.reason}`,
      metadata: { rejectionCode: evaluation.rejectionCode },
    });
    return { allowed: false, evaluation };
  }

  // 6. Dry-run mode
  const mode = data.mode ?? env.MANDARA_WORKER_MODE;
  if (mode === "dry-run") {
    logger.info("Dry-run mode: simulating execution steps", { signingRequestId });
    await updateSigningRequestStatus(signingRequestId, "requested", {
      metadata: {
        workerDryRun: true,
        workerEvaluation: evaluation as unknown as Record<string, unknown>,
        wouldExecute: true,
        nextLiveSteps: ["approve_guarded_message", "ika_sign"],
      },
    });
    await recordAuditEvent({
      organizationId,
      actorType: "worker",
      eventType: "signing_request_dry_run_completed",
      resourceType: "signing_request",
      resourceId: signingRequestId,
      summary: `Dry-run completed for signing request ${signingRequestId}`,
      metadata: {
        wouldExecute: true,
        nextLiveSteps: ["approve_guarded_message", "ika_sign"],
      },
    });
    return {
      mode: "dry-run",
      wouldExecute: true,
      nextLiveSteps: ["approve_guarded_message", "ika_sign"],
    };
  }

  // 7. Live-devnet mode — P4B: execute on devnet
  if (mode === "live-devnet") {
    if (!liveExecutionEnabled) {
      logger.warn("Live-devnet mode disabled by safety gate", { signingRequestId });
      await updateSigningRequestStatus(signingRequestId, "requested", {
        metadata: {
          liveNotImplemented: true,
          safetyGate: "MANDARA_ENABLE_LIVE_EXECUTION is not true",
        },
      });
      await recordAuditEvent({
        organizationId,
        actorType: "worker",
        eventType: "signing_request_worker_skipped",
        resourceType: "signing_request",
        resourceId: signingRequestId,
        summary: `Live execution skipped: safety gate disabled`,
        metadata: { reason: "MANDARA_ENABLE_LIVE_EXECUTION is not true" },
      });
      return {
        mode: "live-devnet",
        wouldExecute: false,
        reason: "Live execution safety gate is disabled",
      };
    }

    // Import dynamically to avoid loading Solana deps in dry-run mode
    const { executeLiveDevnetSigningRequest } = await import(
      "../services/liveDevnetExecution.js"
    );

    try {
      const result = await executeLiveDevnetSigningRequest(
        signingRequestId,
        organizationId
      );
      logger.info("Live execution completed", { signingRequestId, result });
      return {
        mode: "live-devnet",
        ...result,
      };
    } catch (err: any) {
      logger.error("Live execution failed", { signingRequestId, error: err.message });
      await updateSigningRequestStatus(signingRequestId, "failed", {
        metadata: {
          error: err.message,
          liveExecutionFailed: true,
          failedAt: new Date().toISOString(),
        },
      });
      await recordAuditEvent({
        organizationId,
        actorType: "worker",
        eventType: "signing_request_execution_failed",
        resourceType: "signing_request",
        resourceId: signingRequestId,
        summary: `Live execution failed for ${signingRequestId}: ${err.message}`,
        metadata: { error: err.message },
      });
      throw err;
    }
  }

  return { mode, wouldExecute: false, reason: "Unknown worker mode" };
}
