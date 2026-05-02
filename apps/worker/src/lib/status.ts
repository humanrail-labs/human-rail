import { prisma } from "@mandara/db";
import type { SigningRequestStatus } from "@prisma/client";

export async function updateSigningRequestStatus(
  signingRequestId: string,
  status: SigningRequestStatus,
  extra?: {
    rejectionReason?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const data: Record<string, unknown> = { status };
  if (extra?.rejectionReason) data.rejectionReason = extra.rejectionReason;
  if (extra?.metadata) data.metadata = extra.metadata as any;

  return prisma.signingRequest.update({
    where: { id: signingRequestId },
    data,
  });
}
