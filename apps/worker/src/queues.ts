import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import { env } from "./config.js";
import { logger } from "./lib/logger.js";
import { processSigningRequestJob } from "./jobs/signingRequestJob.js";
import { processWebhookDeliveryJob } from "./services/webhookDelivery.js";
import type { WebhookDeliveryJobData } from "./services/webhookDelivery.js";

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const SIGNING_REQUEST_QUEUE_NAME = "mandara.signing-requests";
export const WEBHOOK_QUEUE_NAME = "mandara.webhook-deliveries";

export const signingRequestQueue = new Queue(SIGNING_REQUEST_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

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

export interface SigningRequestJobData {
  signingRequestId: string;
  organizationId: string;
  requestedBy?: string;
  mode?: "dry-run" | "live-devnet";
}

export function createSigningRequestWorker() {
  const worker = new Worker<SigningRequestJobData>(
    SIGNING_REQUEST_QUEUE_NAME,
    async (job: Job<SigningRequestJobData>) => {
      logger.info("Processing signing request job", {
        jobId: job.id,
        signingRequestId: job.data.signingRequestId,
        mode: job.data.mode ?? env.MANDARA_WORKER_MODE,
      });
      return processSigningRequestJob(job.data);
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    logger.info("Job completed", { jobId: job?.id, result: job?.returnvalue });
  });

  worker.on("failed", (job, err) => {
    logger.error("Job failed", { jobId: job?.id, error: err.message });
  });

  return worker;
}

export function createWebhookWorker() {
  const worker = new Worker<WebhookDeliveryJobData>(
    WEBHOOK_QUEUE_NAME,
    async (job: Job<WebhookDeliveryJobData>) => {
      logger.info("Processing webhook delivery job", {
        jobId: job.id,
        deliveryId: job.data.deliveryId,
      });
      return processWebhookDeliveryJob(job.data);
    },
    {
      connection: redisConnection,
      concurrency: 10,
    }
  );

  worker.on("completed", (job) => {
    logger.info("Webhook delivery completed", { jobId: job?.id });
  });

  worker.on("failed", (job, err) => {
    logger.error("Webhook delivery failed", { jobId: job?.id, error: err.message });
  });

  return worker;
}
