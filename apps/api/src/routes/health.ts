import type { FastifyInstance } from "fastify";
import { env } from "../config.js";
import { prisma } from "@mandara/db";
import { success } from "../lib/response.js";

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
    const checks: Record<string, "ok" | "error" | "skipped"> = {
      database: "ok",
      redis: "skipped",
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.database = "error";
    }

    // Redis check prepared for P2+; BullMQ not wired yet
    // try {
    //   await redis.ping();
    // } catch {
    //   checks.redis = "error";
    // }

    const allOk = Object.values(checks).every((c) => c === "ok" || c === "skipped");

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
