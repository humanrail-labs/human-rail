import { createSigningRequestWorker, redisConnection } from "./queues.js";
import { env, isDev } from "./config.js";
import { logger } from "./lib/logger.js";

logger.info("Starting Mandara Worker", {
  env: env.MANDARA_ENV,
  mode: env.MANDARA_WORKER_MODE,
  liveEnabled: env.MANDARA_ENABLE_LIVE_EXECUTION,
  redisUrl: env.REDIS_URL.replace(/:\/\/.*@/, "://***@"), // mask credentials
});

const worker = createSigningRequestWorker();

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

logger.info("Mandara Worker is running and waiting for jobs");
