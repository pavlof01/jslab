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
        required: ["engine", "task", "sourceText"],
        properties: {
          engine: { type: "string", enum: ["v8", "hermes", "sm", "jsc"] },
          task: { type: "string", enum: ["run", "bytecode"] },
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
      BytecodeRequest: {
        type: "object",
        additionalProperties: false,
        required: ["engine", "sourceText"],
        properties: {
          engine: { type: "string", enum: ["v8", "hermes", "sm", "jsc"] },
          task: { type: "string", enum: ["bytecode"] },
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
        summary: "Run or bytecode task",
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
    }
  }
} as const;
