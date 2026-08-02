export const openapiDoc = {
  openapi: "3.0.3",
  info: {
    title: "JSLab API",
    version: "1.0.0"
  },
  servers: [{ url: "/api" }],
  security: [{}, { ApiKeyHeader: [] }, { BearerAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyHeader: { type: "apiKey", in: "header", name: "x-api-key" },
      BearerAuth: { type: "http", scheme: "bearer" }
    },
    schemas: {
      KeyResponse: {
        type: "object",
        additionalProperties: true,
        required: ["ok", "apiKey", "rateLimitPerMin"],
        properties: {
          ok: { type: "boolean" },
          apiKey: { type: "string" },
          rateLimitPerMin: { type: "integer" },
          usage: { type: "string" }
        }
      },
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
              flags: {
                type: "array",
                items: { type: "string" },
                description:
                  "Per-engine allowlisted flags (see GET /flags). Value-bearing flags are passed as '--flag=value'. Anything rejected is echoed back in meta.droppedFlags."
              },
              timeoutMs: {
                type: "integer",
                minimum: 1,
                description:
                  "Wall-clock budget for the run. Clamped to 250–5000 ms: a smaller value cannot outlast the engine's own startup and would always time out.",
              }
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
          meta: {
            type: "object",
            additionalProperties: true,
            properties: {
              durationMs: { type: "integer" },
              engine: { type: "string" },
              cacheHit: { type: "boolean" },
              droppedFlags: {
                type: "array",
                items: { type: "string" },
                description:
                  "Requested flags that were rejected by the allowlist and never reached the engine. A flag accepted anywhere in the request is never listed here, so a repeat or a duplicate with a bad value is not reported as a typo."
              },
              outputTruncated: {
                type: "boolean",
                description: "Output hit the engine's byte cap; stdout and stderr together hold at most outputLimitBytes bytes."
              },
              outputLimitBytes: { type: "integer" }
            }
          }
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
      FlagCatalogResponse: {
        type: "object",
        additionalProperties: true,
        required: ["ok", "engines"],
        properties: {
          ok: { type: "boolean" },
          engines: {
            type: "object",
            additionalProperties: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true,
                required: ["flag", "description", "category"],
                properties: {
                  flag: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  takesValue: { type: "boolean" },
                  valuePattern: { type: "string" }
                }
              }
            }
          }
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
    "/keys": {
      post: {
        summary: "Issue a public API key",
        description:
          "Self-service key issuance (no account needed). Issuance is IP-rate-limited. A key raises the request quota; send it as an 'x-api-key' header or 'Authorization: Bearer <key>'.",
        security: [],
        responses: {
          "201": {
            description: "key issued",
            content: { "application/json": { schema: { $ref: "#/components/schemas/KeyResponse" } } }
          },
          "429": {
            description: "issuance rate limited",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "503": {
            description: "could not issue key",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    },
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
    "/flags": {
      get: {
        summary: "Per-engine flag catalog",
        description:
          "The allowlist /run filters against, with a description and category per flag. Value-bearing flags carry takesValue plus the regex their value must match.",
        security: [],
        responses: {
          "200": {
            description: "flag catalog",
            content: { "application/json": { schema: { $ref: "#/components/schemas/FlagCatalogResponse" } } }
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
