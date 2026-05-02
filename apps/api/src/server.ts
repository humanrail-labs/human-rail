import Fastify from "fastify";
import { env } from "./config.js";
import { errorResponse } from "./lib/response.js";

import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";

import healthRoutes from "./routes/health.js";
import orgRoutes from "./routes/orgs.js";
import agentRoutes from "./routes/agents.js";
import walletRoutes from "./routes/wallets.js";
import policyRoutes from "./routes/policies.js";
import signingRequestRoutes from "./routes/signingRequests.js";
import messageApprovalRoutes from "./routes/messageApprovals.js";
import auditEventRoutes from "./routes/auditEvents.js";
import productRoutes from "./routes/product.js";

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.MANDARA_ENV === "development" ? "debug" : "info",
    },
  });

  // CORS
  await fastify.register(import("@fastify/cors"), {
    origin: env.MANDARA_CORS_ORIGIN,
    credentials: true,
  });

  // Plugins
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(orgRoutes);
  await fastify.register(agentRoutes);
  await fastify.register(walletRoutes);
  await fastify.register(policyRoutes);
  await fastify.register(signingRequestRoutes);
  await fastify.register(messageApprovalRoutes);
  await fastify.register(auditEventRoutes);
  await fastify.register(productRoutes);

  // Global error handler
  fastify.setErrorHandler((err, request, reply) => {
    fastify.log.error(err);

    const error = err as Error & { statusCode?: number; validation?: unknown };

    if (error.validation) {
      return reply.status(400).send(
        errorResponse("VALIDATION_ERROR", error.message)
      );
    }

    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send(
      errorResponse("INTERNAL_ERROR", error.message)
    );
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send(errorResponse("NOT_FOUND", `Route ${request.method} ${request.url} not found`));
  });

  return fastify;
}
