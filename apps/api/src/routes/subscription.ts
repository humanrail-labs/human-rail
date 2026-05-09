import type { FastifyInstance } from "fastify";
import { DevUpgradeSubscriptionInputSchema } from "@mandara/core";
import { env } from "../config.js";
import { success, errorResponse } from "../lib/response.js";
import { resolveOrganizationContext } from "../lib/orgContext.js";
import { devUpgradeSubscription, getSubscriptionSummary } from "../services/subscription.js";

export default async function subscriptionRoutes(fastify: FastifyInstance) {
  fastify.get("/api/subscription", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { organizationId } = await resolveOrganizationContext(request);
    return success(await getSubscriptionSummary(organizationId));
  });

  fastify.post("/api/subscription/dev-upgrade", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }
    if (env.MANDARA_ENV !== "development") {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Route not found"));
    }

    const parse = DevUpgradeSubscriptionInputSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid subscription plan"));
    }

    const { organizationId } = await resolveOrganizationContext(request, parse.data.organizationId);
    const subscription = await devUpgradeSubscription(organizationId, parse.data.planCode);
    return success(subscription);
  });
}
