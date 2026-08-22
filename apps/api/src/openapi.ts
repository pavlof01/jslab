import { ENGINE_KINDS } from "@jslab/engine-runtime";

/**
 * Every route that spends from a rate-limit budget (see rateLimit.ts) sets
 * these on its reply whether or not the request was limited, so they belong
 * on every 2xx/429/5xx response a budget check precedes — not just 429.
 */
const RATE_LIMIT_RESPONSE_HEADERS = {
  "X-RateLimit-Limit": { $ref: "#/components/headers/RateLimitLimit" },
  "X-RateLimit-Remaining": { $ref: "#/components/headers/RateLimitRemaining" },
  "X-RateLimit-Reset": { $ref: "#/components/headers/RateLimitReset" },
  "X-RateLimit-Bucket": { $ref: "#/components/headers/RateLimitBucket" }
} as const;

export const openapiDoc = {
  openapi: "3.0.3",
  info: {
    title: "JSLab API",
    version: "1.0.0"
  },
  // Every path below is the FULL route (e.g. "/api/run", but "/healthz" and
  // "/metrics" with no /api prefix — they're mounted at the app root, not
  // under the gateway's /api namespace). An empty server URL keeps that
  // explicit instead of implying a shared /api prefix that /healthz and
  // /metrics don't actually have.
  servers: [{ url: "" }],
  security: [{}, { ApiKeyHeader: [] }, { BearerAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyHeader: { type: "apiKey", in: "header", name: "x-api-key" },
      BearerAuth: { type: "http", scheme: "bearer" }
    },
    headers: {
      // A request can spend from more than one budget (e.g. general then
      // heavy); these four describe whichever one was checked last, which is
      // the tightest bound on the caller's *next* request — not necessarily
      // the first bucket the route touches.
      RateLimitLimit: {
        description: "Ceiling for the budget named in X-RateLimit-Bucket.",
        schema: { type: "integer" }
      },
      RateLimitRemaining: {
        description: "Requests left in that budget's current window.",
        schema: { type: "integer" }
      },
      RateLimitReset: {
        description: "Unix timestamp (seconds) when that budget's window resets.",
        schema: { type: "integer" }
      },
      RateLimitBucket: {
        description:
          "Which budget the other three X-RateLimit-* headers describe, e.g. general, heavy, trace, key-general, key-heavy, key-trace, or key-issue.",
        schema: { type: "string" }
      }
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
        // The real validator (a plain zod z.object, not .strict()) silently
        // strips unknown fields rather than rejecting the request — false
        // here would document a 400 that never happens.
        additionalProperties: true,
        required: ["engine", "sourceText"],
        properties: {
          engine: { type: "string", enum: [...ENGINE_KINDS] },
          sourceText: { type: "string", minLength: 1 },
          options: {
            type: "object",
            additionalProperties: true,
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
        additionalProperties: true, // z.object without .strict() strips, doesn't reject
        required: ["functionName", "input"],
        properties: {
          functionName: { type: "string", minLength: 1 },
          input: {},
          preferredType: { type: "string", enum: ["string", "number"] }
        }
      },
      TraceExecuteEqualityRequest: {
        type: "object",
        additionalProperties: true, // z.object without .strict() strips, doesn't reject
        required: ["input"],
        properties: {
          input: {
            type: "string",
            minLength: 1,
            description: "A binary expression, e.g. \"1 == '1'\"."
          }
        }
      },
      SerializedValue: {
        description:
          "A spec-typed value: { type: \"String\"|\"Number\"|\"Boolean\"|\"Null\"|\"Undefined\"|\"BigInt\"|\"Symbol\"|\"Object\", value: ... }. Long String/BigInt values are truncated server-side.",
        type: "object",
        additionalProperties: true,
        required: ["type"],
        properties: {
          type: { type: "string" }
        }
      },
      TraceExecuteResponse: {
        type: "object",
        additionalProperties: false,
        required: ["success", "functionName"],
        properties: {
          success: { type: "boolean" },
          functionName: { type: "string" },
          result: { allOf: [{ $ref: "#/components/schemas/SerializedValue" }], description: "Present on success." },
          root: {
            type: "object",
            additionalProperties: true,
            description: "Root algorithm invocation tree (present on success). Sub-algorithm calls nest inside call-kind steps."
          },
          effectiveAlgoId: {
            type: "string",
            description: "Equality only: which spec algorithm actually ran (e.g. \"IsLooselyEqual\")."
          },
          detectedOperator: {
            type: "string",
            description: "Equality only: the operator parsed out of the input (\"==\", \"!==\", \"<=\", ...)."
          },
          error: { type: "string" },
          code: { type: "string", description: "Machine-readable failure reason, e.g. \"execution_budget_exceeded\"." }
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
    "/api/keys": {
      post: {
        summary: "Issue a public API key",
        description:
          "Self-service key issuance (no account needed). Issuance is IP-rate-limited, and one issuer may hold only a bounded number of live keys at once. A key raises the request quota; send it as an 'x-api-key' header or 'Authorization: Bearer <key>'. Requires 'Content-Type: application/json'. Keys expire; re-issue before they do.",
        security: [],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object" } } }
        },
        responses: {
          "201": {
            description: "key issued",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/KeyResponse" } } }
          },
          "415": {
            description: "missing or wrong Content-Type",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "429": {
            description: "issuance rate limited, or too many live keys for this address",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "503": {
            description: "could not issue key",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      },
      delete: {
        summary: "Revoke a public API key",
        description: "Presenting the key is the only proof of ownership this accountless system has.",
        security: [{ ApiKeyHeader: [] }, { BearerAuth: [] }],
        responses: {
          "200": {
            description: "revoked",
            content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } }
          },
          "400": {
            description: "no API key presented",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "404": {
            description: "key not found (already revoked or expired)",
            content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } }
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
    "/metrics": {
      get: {
        summary: "Prometheus metrics",
        description: "Not exposed publicly by the shipped ingress (see infra/k8s/base/ingress.yaml) — reachable only inside the cluster. Documented here because the route exists on every deployment of this app, including ones that route differently.",
        security: [],
        responses: {
          "200": {
            description: "ok",
            content: { "text/plain": { schema: { type: "string" } } }
          }
        }
      }
    },
    "/api/flags": {
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
    "/api/run": {
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
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } }
          },
          "400": {
            description: "invalid request",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "429": {
            description: "rate limited",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "502": {
            description: "engine error",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "504": {
            description: "engine timeout",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    },
    "/api/trace/execute/type-conversion": {
      post: {
        summary: "Trace a type-conversion abstract operation (ToNumber, ToString, ...)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/TraceExecuteRequest" } }
          }
        },
        responses: {
          "200": {
            description: "trace executed",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/TraceExecuteResponse" } } }
          },
          "400": {
            description: "invalid request",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "429": {
            description: "rate limited",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "502": {
            description: "trace service unavailable",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    },
    "/api/trace/execute/equality": {
      post: {
        summary: "Trace an equality-operator expression (==, ===, <=, ...)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/TraceExecuteEqualityRequest" } }
          }
        },
        responses: {
          "200": {
            description: "trace executed",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/TraceExecuteResponse" } } }
          },
          "400": {
            description: "invalid request",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "429": {
            description: "rate limited",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "502": {
            description: "trace service unavailable",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    }
  }
} as const;
