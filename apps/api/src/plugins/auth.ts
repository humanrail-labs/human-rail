import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "@mandara/db";
import { env, isDev } from "../config.js";

export interface DevUser {
  email: string;
  externalId: string;
  dbUserId: string;
  id: string;
  organizationIds: string[];
  isAdmin: boolean;
}

export default fp(async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest("devUser", undefined);

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    const header = request.headers["x-mandara-dev-user"];
    const secret = request.headers["x-mandara-dev-secret"];

    const email =
      typeof header === "string" && header.includes("@")
        ? header
        : isDev
          ? "dev@local"
          : undefined;

    if (!email) {
      return;
    }

    // In non-dev, require a shared secret to prevent trivial header forgery
    if (!isDev && env.MANDARA_DEV_AUTH_SECRET && secret !== env.MANDARA_DEV_AUTH_SECRET) {
      return;
    }

    const externalId = `dev_${Buffer.from(email).toString("base64url")}`;

    // Resolve or create the Prisma user so routes can use internal FK ids.
    const dbUser = await prisma.user.upsert({
      where: { externalId },
      update: { email },
      create: {
        externalId,
        email,
        displayName: email.split("@")[0],
      },
      include: {
        memberships: {
          select: { organizationId: true, role: true },
        },
      },
    });

    const organizationIds = dbUser?.memberships.map((m) => m.organizationId) ?? [];
    const isAdmin = dbUser?.memberships.some((m) => m.role === "admin") ?? false;

    (request as FastifyRequest & { devUser: DevUser }).devUser = {
      email,
      externalId,
      dbUserId: dbUser.id,
      id: externalId,
      organizationIds,
      isAdmin,
    };
  });
});

declare module "fastify" {
  interface FastifyRequest {
    devUser?: DevUser;
  }
}
