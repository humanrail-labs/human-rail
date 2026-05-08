import Fastify from "fastify";
import { env } from "./config.js";
import { errorResponse } from "./lib/response.js";
import { MandaraError } from "./lib/errors.js";

import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import agentAuthPlugin from "./plugins/agentAuth.js";

import healthRoutes from "./routes/health.js";
import orgRoutes from "./routes/orgs.js";
import agentRoutes from "./routes/agents.js";
import walletRoutes from "./routes/wallets.js";
import policyRoutes from "./routes/policies.js";
import signingRequestRoutes from "./routes/signingRequests.js";
import messageApprovalRoutes from "./routes/messageApprovals.js";
import auditEventRoutes from "./routes/auditEvents.js";
import productRoutes from "./routes/product.js";
import webhookRoutes from "./routes/webhooks.js";
import v1SignatureRequestRoutes from "./routes/v1/signatureRequests.js";

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.MANDARA_ENV === "development" ? "debug" : "info",
    },
    bodyLimit: 1024 * 1024, // 1 MB max request body
  });

  // Security headers (HSTS, X-Frame-Options, etc.)
  await fastify.register(import("@fastify/helmet"), {
    contentSecurityPolicy: false, // API doesn't serve HTML
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  // CORS — validated allowlist, never wildcard with credentials
  const allowedOrigins = env.MANDARA_CORS_ORIGIN
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o !== "*");

  await fastify.register(import("@fastify/cors"), {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  });

  // Plugins
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);
  await fastify.register(agentAuthPlugin);

  // Global error handler
  fastify.setErrorHandler((err, request, reply) => {
    fastify.log.error(err);

    const error = err as Error & { statusCode?: number; validation?: unknown };

    if (error.validation) {
      return reply.status(400).send(
        errorResponse("VALIDATION_ERROR", error.message)
      );
    }

    const mandaraLike = error as Error & {
      code?: string;
      details?: Record<string, unknown>;
    };

    if (
      err instanceof MandaraError ||
      error.name === "MandaraError" ||
      (typeof mandaraLike.code === "string" && typeof error.statusCode === "number")
    ) {
      return reply.status(error.statusCode ?? 500).send(
        errorResponse(
          mandaraLike.code ?? "INTERNAL_ERROR",
          error.message,
          mandaraLike.details
        )
      );
    }

    const statusCode = error.statusCode ?? 500;
    const isProd = env.MANDARA_ENV === "production";

    // In production, do not leak internal error details for 500s
    const message = statusCode >= 500 && isProd
      ? "Internal server error"
      : error.message;

    return reply.status(statusCode).send(
      errorResponse("INTERNAL_ERROR", message)
    );
  });

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
  await fastify.register(webhookRoutes);
  await fastify.register(v1SignatureRequestRoutes);

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send(errorResponse("NOT_FOUND", `Route ${request.method} ${request.url} not found`));
  });

  return fastify;
}
