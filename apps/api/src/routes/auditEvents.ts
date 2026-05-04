import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { AuditExportQuerySchema } from "@mandara/core";
import { success, errorResponse } from "../lib/response.js";
import { recordAuditEvent } from "../lib/audit.js";
import { resolveOrganizationContext } from "../lib/orgContext.js";

const ListAuditEventsQuery = z.object({
  orgId: z.string().cuid2().optional(),
  resourceType: z.string().optional(),
  eventType: z.string().optional(),
  limit: z.string().default("50").transform(Number),
  cursor: z.string().optional(),
});

function sanitizeCsvValue(value: string): string {
  const dangerous = /^[=+\-@\t\r]/;
  let sanitized = value.replace(/"/g, '""');
  if (dangerous.test(sanitized)) {
    sanitized = "'" + sanitized;
  }
  return `"${sanitized}"`;
}

function rowToCsv(row: Record<string, unknown>): string {
  const values = [
    String(row.id ?? ""),
    String(row.createdAt ?? ""),
    String(row.organizationId ?? ""),
    String(row.actorType ?? ""),
    String(row.actorId ?? ""),
    String(row.eventType ?? ""),
    String(row.resourceType ?? ""),
    String(row.resourceId ?? ""),
    String(row.summary ?? ""),
    JSON.stringify(row.metadata ?? {}),
  ];
  return values.map((v) => sanitizeCsvValue(v)).join(",");
}

export default async function auditEventRoutes(fastify: FastifyInstance) {
  fastify.get("/api/audit-events", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const query = ListAuditEventsQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
    }

    const { orgId, resourceType, eventType, limit } = query.data;

    const effectiveOrgId = orgId ?? user.organizationIds[0];
    if (!effectiveOrgId || !user.organizationIds.includes(effectiveOrgId)) {
      return reply.status(403).send(errorResponse("FORBIDDEN", "Not a member of this organization"));
    }

    const where: Record<string, unknown> = { organizationId: effectiveOrgId };
    if (resourceType) where.resourceType = resourceType;
    if (eventType) where.eventType = eventType;

    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(events);
  });

  fastify.get("/api/audit-events/export", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const parse = AuditExportQuerySchema.safeParse(request.query);
    if (!parse.success) {
      return reply.status(400).send(
        errorResponse(
          "VALIDATION_ERROR",
          parse.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join("; ")
        )
      );
    }

    const {
      organizationId: explicitOrgId,
      eventType,
      resourceType,
      from,
      to,
      format,
      limit,
    } = parse.data;

    const { organizationId } = await resolveOrganizationContext(request, explicitOrgId);

    const where: Record<string, unknown> = { organizationId };
    if (eventType) where.eventType = eventType;
    if (resourceType) where.resourceType = resourceType;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
    }

    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "audit_export_created",
      resourceType: "audit_event",
      summary: `Exported ${events.length} audit events as ${format}`,
      metadata: { format, count: events.length, filters: { eventType, resourceType, from, to } },
    });

    if (format === "csv") {
      const header = "id,createdAt,organizationId,actorType,actorId,eventType,resourceType,resourceId,summary,metadata";
      const rows = events.map((e) =>
        rowToCsv({
          id: e.id,
          createdAt: e.createdAt.toISOString(),
          organizationId: e.organizationId,
          actorType: e.actorType,
          actorId: e.actorId,
          eventType: e.eventType,
          resourceType: e.resourceType,
          resourceId: e.resourceId,
          summary: e.summary,
          metadata: e.metadata,
        })
      );
      const csv = [header, ...rows].join("\n");
      reply.header("Content-Type", "text/csv");
      reply.header("Content-Disposition", `attachment; filename="mandara-audit-${Date.now()}.csv"`);
      return reply.send(csv);
    }

    return success({
      events,
      meta: { count: events.length, format },
    });
  });
}
