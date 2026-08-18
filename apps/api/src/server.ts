import { Redis } from "ioredis";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

/**
 * Process entry point: read the environment, open the connections, listen, and
 * shut down cleanly. Everything about handling a request lives in `app.ts` and
 * the modules it pulls in.
 */
const config = loadConfig();

const redis = new Redis(config.REDIS_URL, {
  // Small win: fail faster on network/Redis issues instead of hanging too long.
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  commandTimeout: config.REDIS_COMMAND_TIMEOUT_MS,
});

const app = buildApp({ config, redis });

const listen = async () => {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`api listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

const shutdown = async () => {
  try {
    await app.close();
  } catch {
    // ignore
  }

  try {
    await redis.quit(); // Graceful shutdown
  } catch {
    try {
      redis.disconnect();
    } catch {
      // ignore
    }
  }

  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

listen();
