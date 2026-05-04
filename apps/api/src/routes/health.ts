import type { FastifyInstance } from "fastify";
import { env } from "../config.js";
import { prisma } from "@mandara/db";
import { success } from "../lib/response.js";
import { Redis } from "ioredis";

const redisCheck = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
});

redisCheck.on("error", () => {
  // suppress unhandled error warnings during health checks
});

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => {
    return success({
      status: "ok",
      service: "mandara-api",
      time: new Date().toISOString(),
      env: env.MANDARA_ENV,
    });
  });

  fastify.get("/ready", async () => {
    const checks: Record<string, "ok" | "error"> = {
      database: "ok",
      redis: "ok",
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.database = "error";
    }

    try {
      await redisCheck.ping();
    } catch {
      checks.redis = "error";
    }

    const allOk = Object.values(checks).every((c) => c === "ok");

    return success({
      status: allOk ? "ready" : "degraded",
      checks,
    });
  });

  fastify.get("/version", async () => {
    return success({
      service: "mandara-api",
      version: "0.1.0",
      gitCommit: process.env.GIT_COMMIT ?? "unknown",
      humanrailGuardProgramId: env.MANDARA_HUMANRAIL_GUARD_PROGRAM_ID,
      ikaDwalletProgramId: env.MANDARA_IKA_DWALLET_PROGRAM_ID,
      disclaimer:
        "Ika pre-alpha: mock signer, devnet only. Not production custody.",
    });
  });
}
