import type { FastifyInstance } from "fastify";
import { success, errorResponse } from "../lib/response.js";

export default async function policyRoutes(fastify: FastifyInstance) {
  fastify.get("/api/policies", async (request, reply) => {
    return reply.status(501).send(errorResponse("NOT_IMPLEMENTED", "Policy list not implemented in P1"));
  });

  fastify.post("/api/policies", async (request, reply) => {
    return reply.status(501).send(errorResponse("NOT_IMPLEMENTED", "Policy creation not implemented in P1"));
  });
}
