/**
 * MAX_SOURCE_LENGTH has to be rejected by request validation, before anything is
 * handed to engine262. These tests mount the real body schemas on a Fastify
 * instance with a stub handler and assert the handler is never reached.
 */
import fastify from "fastify";
import { describe, expect, it } from "vitest";

import { buildEqualityBodySchema, buildTypeConversionBodySchema } from "../src/server/schema.ts";

const MAX_SOURCE_LENGTH = 32;

function buildApp() {
  const app = fastify();
  app.post(
    "/execute/type-conversion",
    {
      schema: { body: buildTypeConversionBodySchema(["ToNumber", "ToString"], MAX_SOURCE_LENGTH) },
    },
    async () => ({ executed: true }),
  );
  app.post(
    "/execute/equality",
    { schema: { body: buildEqualityBodySchema(MAX_SOURCE_LENGTH) } },
    async () => ({ executed: true }),
  );
  return app;
}

const oversized = "0".repeat(MAX_SOURCE_LENGTH + 1);

describe("request body schemas", () => {
  it("accepts input at the limit", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "ToNumber", input: "0".repeat(MAX_SOURCE_LENGTH) },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ executed: true });
    await app.close();
  });

  it("rejects oversized type-conversion input with a JSON 400", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "ToNumber", input: oversized },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain("must NOT have more than 32 characters");
    await app.close();
  });

  it("rejects oversized equality input with a JSON 400", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/execute/equality",
      payload: { input: oversized },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain("must NOT have more than 32 characters");
    await app.close();
  });

  it("rejects an empty equality expression", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/execute/equality",
      payload: { input: "" },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("rejects an unknown function name", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "DropTables", input: "1" },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
