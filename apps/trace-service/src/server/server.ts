import { loadConfig } from "../../config.ts";

import { buildTraceApp } from "./app.ts";
import { TraceSandbox } from "./execute/sandbox.ts";

const config = loadConfig();
// Traces never run on this thread — see execute/sandbox.ts for why.
const sandbox = new TraceSandbox({ budgetMs: config.MAX_TIMEOUT_MS });
const app = buildTraceApp({ config, sandbox });

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`trace-service listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => app.close().finally(() => process.exit(0)));
process.on("SIGINT", () => app.close().finally(() => process.exit(0)));

start();
