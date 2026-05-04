import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { CreateOrganizationSchema } from "@mandara/core";
import { success, errorResponse } from "../lib/response.js";
import { Errors } from "../lib/errors.js";
import { recordAuditEvent } from "../lib/audit.js";

const CreateOrgBody = CreateOrganizationSchema;

export default async function orgRoutes(fastify: FastifyInstance) {
  fastify.get("/api/orgs", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    // Only return organizations the user is a member of
    const orgs = await prisma.organization.findMany({
      where: {
        id: { in: user.organizationIds },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return success(orgs);
  });

  fastify.post("/api/orgs", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const parse = CreateOrgBody.safeParse(request.body);
    if (!parse.success) {
      return reply
        .status(400)
        .send(
          errorResponse(
            "VALIDATION_ERROR",
            parse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
          )
        );
    }

    const { name, slug } = parse.data;

    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      return reply.status(409).send(errorResponse("CONFLICT", "Organization slug already exists"));
    }

    const org = await prisma.organization.create({
      data: { name, slug },
    });

    // Auto-create membership for the creator
    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "admin",
      },
    });

    // Refresh user's organizationIds in memory
    user.organizationIds.push(org.id);
    user.isAdmin = true;

    await recordAuditEvent({
      organizationId: org.id,
      actorType: "user",
      actorId: user.id,
      eventType: "organization_created",
      resourceType: "organization",
      resourceId: org.id,
      summary: `Organization ${name} created`,
    });

    return reply.status(201).send(success(org));
  });
}
