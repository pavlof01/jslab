import type { FastifyInstance } from "fastify";

import { buildEngineApp, type EngineSpec } from "./app.js";

export * from "./flags.js";
export * from "./config.js";
export * from "./lockdown.js";
export * from "./version.js";
export { buildEngineApp } from "./app.js";
export type { EngineSpec, Invocation, InvocationContext, PreludeScript } from "./app.js";

/**
 * Boot an engine service: build the shared app (see app.ts) and own the
 * process-level concerns — the listening socket and the shutdown signals.
 * Everything a test cares about lives in `buildEngineApp`, which needs no
 * socket and no environment.
 */
export function startEngineServer(spec: EngineSpec): FastifyInstance {
  const { config, engine } = spec;
  const app = buildEngineApp(spec);

  const listen = async () => {
    try {
      await app.listen({ port: config.PORT, host: config.HOST });
      app.log.info(`engine-${engine} listening on ${config.HOST}:${config.PORT}`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => app.close().finally(() => process.exit(0)));
  process.on("SIGINT", () => app.close().finally(() => process.exit(0)));

  listen();

  return app;
}
