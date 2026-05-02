import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { env, isDev } from "../config.js";

export interface DevUser {
  email: string;
  id: string;
}

export default fp(async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest("devUser", undefined);

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    const header = request.headers["x-mandara-dev-user"];
    const email =
      typeof header === "string" && header.includes("@")
        ? header
        : isDev
          ? "dev@local"
          : undefined;

    if (!email) {
      return;
    }

    // In P1, every dev user gets a deterministic ID derived from email
    const id = `dev_${Buffer.from(email).toString("base64url")}`;
    (request as FastifyRequest & { devUser: DevUser }).devUser = { email, id };
  });
});

declare module "fastify" {
  interface FastifyRequest {
    devUser?: DevUser;
  }
}
