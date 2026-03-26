import fastify from "fastify";

import { loadConfig } from "../../config.ts";
import { ExecuteRequest, IReply } from "./types.ts";
import { executeECMA262Function } from "./execute/index.ts";
import { AVAILABLE_FUNCTIONS } from "./execute/helpers.ts";

const config = loadConfig();
const app = fastify({ logger: { level: config.LOG_LEVEL } });

const bodyJsonSchema = {
  type: "object",
  properties: {
    functionName: { type: "string", enum: AVAILABLE_FUNCTIONS },
    input: { type: "string" },
    preferredType: { type: "string", enum: ["string", "number"] },
  },
  required: ["functionName", "input"],
};

// Routes
app.get("/healthz", async () => ({ ok: true }));

app.get("/functions", async () => ({
  available_functions: AVAILABLE_FUNCTIONS,
  description: "POST to /execute with { functionName, input, preferredType? }",
  note: "Real ECMA262 abstract operation execution with full trace capture",
  input_format: "input can be a string, number, boolean, null, undefined, or an object",
}));

const executeHandler = async (request: { body: ExecuteRequest }, reply: any) => {
  const { functionName, input, preferredType } = request.body;

  const result = await executeECMA262Function(functionName, input, preferredType);

  return reply.status(result.success ? 200 : 400).send(result);
};

app.post<{ Body: ExecuteRequest }>("/execute", { schema: { body: bodyJsonSchema } }, executeHandler);

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`trace-service started on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
