import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import {
  ApproveAgentProposalInputSchema,
  CreateAgentChatSessionInputSchema,
  RejectAgentProposalInputSchema,
  SendAgentChatMessageInputSchema,
} from "@mandara/core";
import { success, errorResponse } from "../lib/response.js";
import { resolveOrganizationContext } from "../lib/orgContext.js";
import {
  approveAgentActionProposal,
  getOrCreateAgentChatSession,
  handleAgentChatMessage,
  loadSession,
  rejectAgentActionProposal,
} from "../services/agentChat.js";

const ListSessionsQuery = z.object({
  orgId: z.string().cuid2().optional(),
  limit: z.string().default("30").transform(Number),
});

export default async function agentChatRoutes(fastify: FastifyInstance) {
  fastify.get("/api/agent-chat/sessions", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const parse = ListSessionsQuery.safeParse(request.query);
    if (!parse.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
    }
    const { organizationId } = await resolveOrganizationContext(request, parse.data.orgId);

    const sessions = await prisma.agentChatSession.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: parse.data.limit,
      include: {
        agent: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        proposals: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            signingRequest: { select: { id: true, requestId: true, status: true } },
          },
        },
      },
    });

    return success(sessions);
  });

  fastify.post("/api/agent-chat/sessions", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const parse = CreateAgentChatSessionInputSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", formatZodError(parse.error)));
    }
    const { organizationId } = await resolveOrganizationContext(request, parse.data.organizationId);

    const session = await getOrCreateAgentChatSession({
      organizationId,
      agentId: parse.data.agentId,
      title: parse.data.title,
      userId: user.id,
    });

    return reply.status(201).send(success(session));
  });

  fastify.get("/api/agent-chat/sessions/:id", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };
    const session = await loadSession(id);
    if (!session) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Agent Chat session not found"));
    }
    await resolveOrganizationContext(request, session.organizationId);

    return success(session);
  });

  fastify.post("/api/agent-chat/messages", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const parse = SendAgentChatMessageInputSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", formatZodError(parse.error)));
    }
    const { organizationId } = await resolveOrganizationContext(request, parse.data.organizationId);

    const result = await handleAgentChatMessage({
      organizationId,
      sessionId: parse.data.sessionId,
      agentId: parse.data.agentId,
      message: parse.data.message,
      mode: parse.data.mode,
      userId: user.id,
    });

    if ("error" in result) {
      const err = result.error as { status: number; code: string; message: string };
      return reply.status(err.status).send(errorResponse(err.code, err.message));
    }

    return success(result);
  });

  fastify.post("/api/agent-chat/proposals/:id/approve", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };
    const parse = ApproveAgentProposalInputSchema.safeParse({
      ...(request.body as Record<string, unknown> | undefined),
      proposalId: id,
    });
    if (!parse.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", formatZodError(parse.error)));
    }

    const proposal = await prisma.agentActionProposal.findUnique({ where: { id } });
    if (!proposal) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Proposal not found"));
    }
    const { organizationId } = await resolveOrganizationContext(request, proposal.organizationId);

    const result = await approveAgentActionProposal({
      proposalId: parse.data.proposalId,
      enqueue: parse.data.enqueue,
      actor: { organizationId, userId: user.id },
    });

    if ("error" in result) {
      const err = result.error as { status: number; code: string; message: string };
      return reply.status(err.status).send(errorResponse(err.code, err.message));
    }

    return success(result);
  });

  fastify.post("/api/agent-chat/proposals/:id/reject", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };
    const parse = RejectAgentProposalInputSchema.safeParse({
      ...(request.body as Record<string, unknown> | undefined),
      proposalId: id,
    });
    if (!parse.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", formatZodError(parse.error)));
    }

    const proposal = await prisma.agentActionProposal.findUnique({ where: { id } });
    if (!proposal) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Proposal not found"));
    }
    const { organizationId } = await resolveOrganizationContext(request, proposal.organizationId);

    const result = await rejectAgentActionProposal({
      proposalId: parse.data.proposalId,
      reason: parse.data.reason,
      actor: { organizationId, userId: user.id },
    });

    if ("error" in result) {
      const err = result.error as { status: number; code: string; message: string };
      return reply.status(err.status).send(errorResponse(err.code, err.message));
    }

    return success(result);
  });
}

function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
