import type { FastifyInstance } from "fastify";
import { success, errorResponse } from "../lib/response.js";

export default async function signingRequestRoutes(fastify: FastifyInstance) {
  fastify.get("/api/signing-requests", async (request, reply) => {
    return reply.status(501).send(errorResponse("NOT_IMPLEMENTED", "Signing request list not implemented in P1"));
  });

  fastify.post("/api/signing-requests", async (request, reply) => {
    return reply.status(501).send(errorResponse("NOT_IMPLEMENTED", "Signing request creation not implemented in P1"));
  });
}
