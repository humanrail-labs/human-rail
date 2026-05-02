import type { FastifyInstance } from "fastify";
import { success, errorResponse } from "../lib/response.js";
import { Errors } from "../lib/errors.js";

export default async function agentRoutes(fastify: FastifyInstance) {
  fastify.get("/api/agents", async (request, reply) => {
    return reply.status(501).send(errorResponse("NOT_IMPLEMENTED", "Agent list not implemented in P1"));
  });

  fastify.post("/api/agents", async (request, reply) => {
    return reply.status(501).send(errorResponse("NOT_IMPLEMENTED", "Agent creation not implemented in P1"));
  });
}
