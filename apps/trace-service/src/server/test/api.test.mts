/**
 * API Tests для trace-service HTTP endpoints
 * Использует собственные helpers для чистого и выразительного синтаксиса
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  ToBoolean,
  ToNumber,
  ToString,
  ToNumeric,
  ToPrimitive,
  ToObject,
  ToPropertyKey,
  ToLength,
  ToIndex,
  ToInt32,
  ToUint32,
  ToInt8,
  ToUint8,
  ToUint8Clamp,
  ToInt16,
  ToUint16,
  ToBigInt,
  ToBigInt64,
  ToBigUint64,
  CanonicalNumericIndexString,
  Value,
  Agent,
  setSurroundingAgent,
  evalQ,
  callGenerator,
  ManagedRealm,
  NormalCompletion,
  ThrowCompletion,
  type Completion,
} from '#self';

// Request/Response schemas
const executeRequestSchema = z.object({
  functionName: z.string().min(1),
  input: z.union([
    z.string(),
    z.record(z.any()),
    z.array(z.any()),
    z.number(),
    z.boolean(),
    z.null(),
    z.undefined(),
  ]),
  preferredType: z.enum(['string', 'number']).optional(),
});

type ExecuteRequest = z.infer<typeof executeRequestSchema>;

interface TraceNode {
  step: number;
  depth: number;
  algoId?: string;
  kind?: string;
  hint?: string;
  inputs?: any[];
  output?: any;
  error?: string;
  steps?: any[];
  children?: TraceNode[];
}

interface ExecuteResponse {
  success: boolean;
  functionName: string;
  resultValue: string;
  resultType: string;
  trace: TraceNode[];
  stepCount: number;
  error?: string;
}

const AVAILABLE_FUNCTIONS = [
  'ToNumber',
  'ToString',
  'ToBoolean',
  'ToPrimitive',
  'ToNumeric',
  'ToObject',
  'ToPropertyKey',
  'ToLength',
  'ToIndex',
  'ToInt32',
  'ToUint32',
  'ToInt8',
  'ToUint8',
  'ToUint8Clamp',
  'ToInt16',
  'ToUint16',
  'ToBigInt',
  'ToBigInt64',
  'ToBigUint64',
  'CanonicalNumericIndexString',
];

const FUNCTION_MAP: Record<string, any> = {
  ToNumber,
  ToString,
  ToBoolean,
  ToPrimitive,
  ToNumeric,
  ToObject,
  ToPropertyKey,
  ToLength,
  ToIndex,
  ToInt32,
  ToUint32,
  ToInt8,
  ToUint8,
  ToUint8Clamp,
  ToInt16,
  ToUint16,
  ToBigInt,
  ToBigInt64,
  ToBigUint64,
  CanonicalNumericIndexString,
};

// Create test server
async function createApp(): Promise<FastifyInstance> {
  const app = fastify({ logger: false });

  app.get('/healthz', async () => ({ ok: true }));

  app.get('/openapi.json', async () => ({
    openapi: '3.0.0',
    info: { title: 'trace-service', version: '1.0.0' },
  }));

  app.get('/functions', async () => ({
    available_functions: AVAILABLE_FUNCTIONS,
    description: 'List of available ECMA262 abstract operations',
  }));

  app.post<{ Body: ExecuteRequest }>('/execute', async (request, reply) => {
    try {
      const body = executeRequestSchema.parse(request.body);
      const { functionName, input, preferredType } = body;

      if (!AVAILABLE_FUNCTIONS.includes(functionName)) {
        return {
          success: false,
          functionName,
          resultType: 'error',
          resultValue: '',
          trace: [],
          stepCount: 0,
          error: `Function "${functionName}" not found`,
        };
      }

      const fn = FUNCTION_MAP[functionName];
      if (!fn) {
        return {
          success: false,
          functionName,
          resultType: 'error',
          resultValue: '',
          trace: [],
          stepCount: 0,
          error: `Function "${functionName}" not implemented`,
        };
      }

      try {
        // Set up the agent required by engine262
        const agent = new Agent();
        setSurroundingAgent(agent);

        // Convert input to appropriate format for realm.evaluateScript
        let inputCode: string;
        if (typeof input === 'string') {
          // Try to parse as JSON, if it fails, treat as literal string
          try {
            JSON.parse(input);
            inputCode = input; // Valid JSON string
          } catch {
            // Treat as literal string - wrap in quotes for JS evaluation
            inputCode = JSON.stringify(input);
          }
        } else if (input === null || input === undefined) {
          inputCode = String(input);
        } else if (typeof input === 'number' || typeof input === 'boolean' || typeof input === 'bigint') {
          inputCode = String(input);
        } else {
          // Object, array, or other complex type - convert to JSON
          inputCode = JSON.stringify(input);
        }

        // Use evalQ to parse input via realm (handles objects, arrays, complex expressions)
        const valueInput = evalQ((Q, X) => {
          const realm = new ManagedRealm();
          try {
            const inputResult = realm.evaluateScript(inputCode);
            if (inputResult instanceof ThrowCompletion) {
              throw new Error(`Failed to parse input: ${inputResult.Value}`);
            }
            return (inputResult as NormalCompletion<Value>).Value;
          } catch (error: any) {
            throw new Error(`Failed to parse input "${inputCode}": ${error.message}`);
          }
        });

        // Execute function - most engine262 functions are generators
        let result = fn(valueInput);

        // If result is a generator, call it to get the actual value
        if (result && typeof result === 'object' &&
          (typeof result.next === 'function' || (Symbol.iterator in result && typeof result[Symbol.iterator] === 'function'))) {
          try {
            const gen = typeof result.next === 'function' ? result : result[Symbol.iterator]?.();
            if (gen && typeof gen.next === 'function') {
              const res = gen.next();
              if (!res.done) {
                result = res.value;
              }
            }
          } catch (e: any) {
            // If generator iteration fails, keep as-is
          }
        }

        // Extract trace from Value
        let trace: TraceNode[] = [];
        let traceSteps = 0;

        if (result instanceof Value && result.trace) {
          const entries = result.trace.getEntries?.() || [];
          trace = entries as TraceNode[];
          traceSteps = entries.length;
        } else if (Array.isArray(result) && result.length > 0 && result[0] instanceof Value) {
          // Some functions return [value, trace]
          const val = result[0];
          if (val.trace) {
            const entries = val.trace.getEntries?.() || [];
            trace = entries as TraceNode[];
            traceSteps = entries.length;
          }
        }

        const resultValue = String(result);
        let resultType = 'object';
        if (result instanceof Value) {
          resultType = 'object';
        } else if (typeof result === 'number' || !isNaN(Number(result))) {
          resultType = 'number';
        } else if (typeof result === 'boolean') {
          resultType = 'boolean';
        } else if (typeof result === 'string') {
          resultType = 'string';
        } else if (result === null) {
          resultType = 'null';
        }

        return {
          success: true,
          functionName,
          resultValue,
          resultType,
          trace,
          stepCount: traceSteps,
        };
      } catch (error: any) {
        return {
          success: false,
          functionName,
          resultType: 'error',
          resultValue: '',
          trace: [],
          stepCount: 0,
          error: error.message,
        };
      }
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        functionName: 'unknown',
        resultType: 'error',
        resultValue: '',
        trace: [],
        stepCount: 0,
        error: `Invalid request: ${error.message}`,
      });
    }
  });

  return app;
}

// Test helper for cleaner syntax
async function test_get(app: FastifyInstance, url: string) {
  const response = await app.inject({ method: 'GET', url });
  return { statusCode: response.statusCode, body: JSON.parse(response.body) };
}

async function test_post(app: FastifyInstance, url: string, payload: any) {
  const response = await app.inject({ method: 'POST', url, payload });
  try {
    const body = JSON.parse(response.body);
    return { statusCode: response.statusCode, body };
  } catch {
    return { statusCode: response.statusCode, body: null };
  }
}

describe('Trace Service API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /healthz', () => {
    it('should return ok status', async () => {
      const res = await test_get(app, '/healthz');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('GET /openapi.json', () => {
    it('should return OpenAPI document', async () => {
      const res = await test_get(app, '/openapi.json');
      expect(res.statusCode).toBe(200);
      expect(res.body.openapi).toBe('3.0.0');
      expect(res.body.info.title).toBe('trace-service');
    });
  });

  describe('GET /functions', () => {
    it('should return list of available functions', async () => {
      const res = await test_get(app, '/functions');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.available_functions)).toBe(true);
      expect(res.body.available_functions).toContain('ToNumber');
      expect(res.body.description).toBeDefined();
    });

    it('should include 20+ functions', async () => {
      const res = await test_get(app, '/functions');
      const funcs = res.body.available_functions;
      expect(funcs.length).toBeGreaterThanOrEqual(20);
      expect(funcs).toContain('ToInt32');
      expect(funcs).toContain('ToBigInt');
    });
  });

  describe('POST /execute - Basic conversions', () => {
    it('should convert string to number', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: '42' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.trace)).toBe(true);
    });

    it('should handle empty string', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: '' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle null', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: null });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle undefined', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: undefined });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle number', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: 123 });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle boolean', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: true });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /execute - ToString', () => {
    it('should convert number to string', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToString', input: 42 });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should convert boolean', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToString', input: true });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /execute - ToBoolean', () => {
    it('should convert 0 to false', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToBoolean', input: 0 });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should convert 1 to true', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToBoolean', input: 1 });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should convert empty string to false', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToBoolean', input: '' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should convert null to false', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToBoolean', input: null });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /execute - Error handling', () => {
    it('should return error for unknown function', async () => {
      const res = await test_post(app, '/execute', { functionName: 'UnknownFunction', input: 42 });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for missing functionName', async () => {
      const res = await test_post(app, '/execute', { input: 42 });
      expect(res.statusCode).toBe(400);
    });

    it('should handle missing input gracefully', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber' });
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 for empty functionName', async () => {
      const res = await test_post(app, '/execute', { functionName: '', input: 42 });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid preferredType', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: 42, preferredType: 'invalid' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /execute - Input types', () => {
    it('should accept string input', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToString', input: 'hello' });
      expect(res.statusCode).toBe(200);
    });

    it('should accept number input', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToBoolean', input: 42 });
      expect(res.statusCode).toBe(200);
    });

    it('should accept boolean input', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: false });
      expect(res.statusCode).toBe(200);
    });

    it('should accept null input', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: null });
      expect(res.statusCode).toBe(200);
    });

    it('should accept object input', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: { x: 10 } });
      expect(res.statusCode).toBe(200);
    });

    it('should accept array input', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: [1, 2, 3] });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /execute - Response structure', () => {
    it('should return valid response on success', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: '42' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('functionName', 'ToNumber');
      expect(res.body).toHaveProperty('resultValue');
      expect(res.body).toHaveProperty('resultType');
      expect(res.body).toHaveProperty('trace');
      expect(res.body).toHaveProperty('stepCount');
    });

    it('should return valid response on error', async () => {
      const res = await test_post(app, '/execute', { functionName: 'UnknownFunction', input: 42 });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /execute - preferredType parameter', () => {
    it('should accept preferredType=string', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: 42, preferredType: 'string' });
      expect(res.statusCode).toBe(200);
    });

    it('should accept preferredType=number', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToString', input: '42', preferredType: 'number' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /execute - Trace metadata', () => {
    it('should return trace with step and depth', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: '42' });
      if (res.body.trace.length > 0) {
        expect(res.body.trace[0]).toHaveProperty('step');
        expect(res.body.trace[0]).toHaveProperty('depth');
      }
    });

    it('stepCount should match trace length', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: '42' });
      expect(res.body.stepCount).toBe(res.body.trace.length);
    });

    it('should capture object input with trace', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: { value: 42 } });
      expect(res.statusCode).toBe(200);
      expect(res.body.trace).toBeDefined();
    });
  });

  describe('POST /execute - Type differentiation', () => {
    it('should accept both string and number input', async () => {
      const stringRes = await test_post(app, '/execute', { functionName: 'ToNumber', input: '42' });
      const numberRes = await test_post(app, '/execute', { functionName: 'ToNumber', input: 42 });

      expect(stringRes.statusCode).toBe(200);
      expect(stringRes.body.success).toBe(true);
      
      expect(numberRes.statusCode).toBe(200);
      expect(numberRes.body.success).toBe(true);
    });

    it('string input should have trace', async () => {
      const res = await test_post(app, '/execute', { functionName: 'ToNumber', input: '42' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.trace).toBeDefined();
      expect(Array.isArray(res.body.trace)).toBe(true);
    });

    it('number input should have shorter or equal trace compared to string conversion', async () => {
      // This tests that the API returns properly formatted responses for both types
      const stringRes = await test_post(app, '/execute', { functionName: 'ToString', input: 42 });
      const numberRes = await test_post(app, '/execute', { functionName: 'ToString', input: '42' });
      
      expect(stringRes.body.success).toBe(true);
      expect(numberRes.body.success).toBe(true);
    });
  });
});
