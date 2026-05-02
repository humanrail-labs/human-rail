import { prisma } from "@mandara/db";
import { Prisma } from "@prisma/client";
import type { AuditEventType } from "@prisma/client";

export interface RecordAuditEventInput {
  organizationId: string;
  actorType: string;
  actorId?: string;
  eventType: AuditEventType;
  resourceType?: string;
  resourceId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuditEvent(input: RecordAuditEventInput) {
  return prisma.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorType: input.actorType,
      actorId: input.actorId,
      eventType: input.eventType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      summary: input.summary,
      metadata: (input.metadata ?? {}) as Prisma.JsonObject,
    },
  });
}
