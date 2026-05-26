import fastify, { FastifyReply, FastifyRequest } from "fastify";

import { loadConfig } from "../../config.ts";
import { executeUnaryConversion, executeBinaryExpression } from "./execute/index.ts";
import { AVAILABLE_FUNCTIONS, FUNCTION_META, SUPPORTED_OPERATORS } from "./execute/helpers.ts";
import { buildSpecHtmlForFunction, SUPPORTED_SPEC_FUNCTIONS } from "./spec-generator.ts";

const config = loadConfig();
const app = fastify({ logger: { level: config.LOG_LEVEL } });

const typeConversionBodySchema = {
  type: "object",
  properties: {
    functionName: { type: "string", enum: AVAILABLE_FUNCTIONS },
    input: { type: "string" },
    preferredType: { type: "string", enum: ["string", "number"] },
  },
  required: ["functionName", "input"],
};

const equalityBodySchema = {
  type: "object",
  properties: {
    input: { type: "string", minLength: 1 },
  },
  required: ["input"],
};

app.get("/healthz", async () => ({ ok: true }));

app.get("/functions", async () => ({
  available_functions: AVAILABLE_FUNCTIONS,
  function_meta: FUNCTION_META,
  supported_operators: SUPPORTED_OPERATORS,
  endpoints: {
    type_conversion: "POST /execute/type-conversion { functionName, input, preferredType? }",
    equality: "POST /execute/equality { input } — input is a binary expression like \"{} == ![]\"",
  },
  note: "Real ECMA262 abstract operation execution with full trace capture",
}));

type UnaryBody = { functionName: string; input: string; preferredType?: "string" | "number" };
type BinaryBody = { input: string };

app.post<{ Body: UnaryBody }>(
  "/execute/type-conversion",
  { schema: { body: typeConversionBodySchema } },
  async (request: FastifyRequest<{ Body: UnaryBody }>, reply: FastifyReply) => {
    const { functionName, input, preferredType } = request.body;
    const result = await executeUnaryConversion(functionName, input, preferredType);
    return reply.status(result.success ? 200 : 400).send(result);
  },
);

app.post<{ Body: BinaryBody }>(
  "/execute/equality",
  { schema: { body: equalityBodySchema } },
  async (request: FastifyRequest<{ Body: BinaryBody }>, reply: FastifyReply) => {
    const { input } = request.body;
    const result = await executeBinaryExpression(input);
    return reply.status(result.success ? 200 : 400).send(result);
  },
);

app.get<{ Params: { functionName: string } }>("/spec/:functionName", async (request, reply) => {
  const { functionName } = request.params;

  if (!SUPPORTED_SPEC_FUNCTIONS.includes(functionName)) {
    return reply.status(404).send({ error: `No spec available for "${functionName}"` });
  }

  const html = await buildSpecHtmlForFunction(functionName);
  if (!html) {
    return reply.status(404).send({ error: `No spec available for "${functionName}"` });
  }

  const cacheControl = process.env.NODE_ENV === "production" ? "public, max-age=3600" : "no-store";

  return reply
    .header("Content-Type", "text/html; charset=utf-8")
    .header("Cache-Control", cacheControl)
    .send(html);
});

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
