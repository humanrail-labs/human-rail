/**
 * Optional HTTP health server for the Mandara Worker.
 * Only starts when MANDARA_WORKER_HEALTH_PORT is set.
 */
import http from "node:http";
import { env } from "./config.js";
import { logger } from "./lib/logger.js";
import { prisma } from "@mandara/db";
import { redisConnection } from "./queues.js";

export function startHealthServer(): http.Server | undefined {
  const port = env.MANDARA_WORKER_HEALTH_PORT;
  if (!port) {
    logger.info("Worker health server disabled (MANDARA_WORKER_HEALTH_PORT not set)");
    return undefined;
  }

  const server = http.createServer(async (req, res) => {
    const url = req.url ?? "";

    if (url === "/health" || url === "/ready") {
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
        await redisConnection.ping();
      } catch {
        checks.redis = "error";
      }

      const allOk = Object.values(checks).every((c) => c === "ok");
      const statusCode = url === "/ready" && !allOk ? 503 : 200;

      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: allOk ? "ok" : "degraded",
          service: "mandara-worker",
          workerMode: env.MANDARA_WORKER_MODE,
          liveExecutionEnabled: env.MANDARA_ENABLE_LIVE_EXECUTION,
          checks,
          startedAt: new Date().toISOString(),
        })
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(port, "0.0.0.0", () => {
    logger.info(`Worker health server listening on 0.0.0.0:${port}`);
  });

  return server;
}
