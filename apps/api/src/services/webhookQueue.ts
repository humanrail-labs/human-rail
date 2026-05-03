import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config.js";

const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const WEBHOOK_QUEUE_NAME = "mandara.webhook-deliveries";

export const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});
