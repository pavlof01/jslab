export const openapiDoc = {
  openapi: "3.0.3",
  info: {
    title: "JSLab API",
    version: "1.0.0"
  },
  servers: [{ url: "/api" }],
  components: {
    schemas: {
      RunRequest: {
        type: "object",
        additionalProperties: false,
        required: ["engine", "sourceText"],
        properties: {
          engine: { type: "string", enum: ["v8", "hermes", "sm", "jsc"] },
          sourceText: { type: "string", minLength: 1 },
          options: {
            type: "object",
            additionalProperties: false,
            properties: {
              flags: { type: "array", items: { type: "string" } },
              timeoutMs: { type: "integer", minimum: 1 }
            }
          }
        }
      },
TraceExecuteRequest: {
        type: "object",
        additionalProperties: false,
        required: ["functionName", "input"],
        properties: {
          functionName: { type: "string", minLength: 1 },
          input: {},
          preferredType: { type: "string", enum: ["string", "number"] }
        }
      },
      TraceExecuteResponse: {
        type: "object",
        additionalProperties: true,
        required: ["success"],
        properties: {
          success: { type: "boolean" },
          functionName: { type: "string" },
          resultValue: { type: "string" },
          resultType: { type: "string" },
          trace: { type: "array", items: { type: "object", additionalProperties: true } },
          stepCount: { type: "integer" },
          error: { type: "string" }
        }
      },
      Artifact: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "mime", "dataBase64"],
        properties: {
          kind: { type: "string", enum: ["bytecode"] },
          mime: { type: "string" },
          dataBase64: { type: "string" }
        }
      },
      ApiResponse: {
        type: "object",
        additionalProperties: true,
        required: ["ok", "stdout", "stderr", "artifacts", "meta"],
        properties: {
          ok: { type: "boolean" },
          stdout: { type: "string" },
          stderr: { type: "string" },
          artifacts: { type: "array", items: { $ref: "#/components/schemas/Artifact" } },
          meta: { type: "object" }
        }
      },
      ErrorResponse: {
        type: "object",
        additionalProperties: true,
        required: ["ok", "error"],
        properties: {
          ok: { type: "boolean", enum: [false] },
          error: { type: "string" }
        }
      },
      HealthzResponse: {
        type: "object",
        additionalProperties: true,
        required: ["ok"],
        properties: {
          ok: { type: "boolean" },
          redis: { type: "string" }
        }
      }
    }
  },
  paths: {
    "/healthz": {
      get: {
        summary: "Health check",
        security: [],
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/HealthzResponse" } }
            }
          }
        }
      }
    },
    "/run": {
      post: {
        summary: "Run code on a JS engine",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RunRequest" } }
          }
        },
        responses: {
          "200": {
            description: "ok",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } }
          },
          "400": {
            description: "invalid request",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "429": {
            description: "rate limited",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "502": {
            description: "engine error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "504": {
            description: "engine timeout",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    },
    "/trace/execute": {
      post: {
        summary: "Execute abstract operation trace",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/TraceExecuteRequest" } }
          }
        },
        responses: {
          "200": {
            description: "trace executed",
            content: { "application/json": { schema: { $ref: "#/components/schemas/TraceExecuteResponse" } } }
          },
          "400": {
            description: "invalid request",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "502": {
            description: "trace service unavailable",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "503": {
            description: "trace service unavailable",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    }
  }
} as const;
