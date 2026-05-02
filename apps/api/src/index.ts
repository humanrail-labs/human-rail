import { buildServer } from "./server.js";
import { env } from "./config.js";

async function main() {
  const server = await buildServer();

  try {
    await server.listen({
      port: env.MANDARA_API_PORT,
      host: env.MANDARA_API_HOST,
    });
    server.log.info(`Mandara API listening on ${env.MANDARA_API_HOST}:${env.MANDARA_API_PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
