import fp from "fastify-plugin";
import { prisma } from "@mandara/db";
import type { FastifyInstance } from "fastify";

export default fp(async function prismaPlugin(fastify: FastifyInstance) {
  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});

// Augment FastifyInstance for TypeScript
declare module "fastify" {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}
