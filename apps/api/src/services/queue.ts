import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config.js";

const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const SIGNING_REQUEST_QUEUE_NAME = "mandara.signing-requests";

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

export interface EnqueueSigningRequestInput {
  signingRequestId: string;
  organizationId: string;
  requestedBy?: string;
  mode?: "dry-run" | "live-devnet";
}

export async function enqueueSigningRequest(input: EnqueueSigningRequestInput) {
  const job = await signingRequestQueue.add("execute-signing-request", {
    signingRequestId: input.signingRequestId,
    organizationId: input.organizationId,
    requestedBy: input.requestedBy,
    mode: input.mode,
  });
  return job;
}
