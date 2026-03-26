/**
 * Integration test for HTTP API - corner cases
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';
import { executeECMA262Function } from '../execute/index.ts';

describe('executeECMA262Function - corner cases', () => {
  it('should handle NaN correctly for ToNumber("abc")', async () => {
    // Pass string literal "abc"
    const response = await executeECMA262Function('ToNumber', 'abc');
    
    expect(response.success).toBe(true);
    expect(response.functionName).toBe('ToNumber');
    expect(response.resultValue).toBe('NaN');
    expect(response.resultType).toBe('Number');
  });

  it('should handle Infinity for ToNumber("Infinity")', async () => {
    const response = await executeECMA262Function('ToNumber', 'Infinity');
    
    expect(response.success).toBe(true);
    expect(response.functionName).toBe('ToNumber');
    expect(response.resultValue).toBe('Infinity');
    expect(response.resultType).toBe('Number');
  });

  it('should handle numeric string correctly', async () => {
    // Pass "42" as valid JSON number
    const response = await executeECMA262Function('ToNumber', 42);
    
    expect(response.success).toBe(true);
    expect(response.functionName).toBe('ToNumber');
    expect(response.resultValue).toBe('42');
    expect(response.resultType).toBe('Number');
  });

  it('should handle empty string for ToNumber("")', async () => {
    // Empty string literals should convert to 0
    const response = await executeECMA262Function('ToNumber', '');
    
    expect(response.success).toBe(true);
    expect(response.functionName).toBe('ToNumber');
    expect(response.resultValue).toBe('0');
    expect(response.resultType).toBe('Number');
  });

  it('should handle whitespace string for ToNumber', async () => {
    // Whitespace-only strings should convert to 0
    const response = await executeECMA262Function('ToNumber', '   ');
    
    expect(response.success).toBe(true);
    expect(response.functionName).toBe('ToNumber');
    expect(response.resultValue).toBe('0');
    expect(response.resultType).toBe('Number');
  });

  it('should handle null input correctly', async () => {
    const response = await executeECMA262Function('ToNumber', null);
    
    expect(response.success).toBe(true);
    expect(response.resultValue).toBe('0');
    expect(response.resultType).toBe('Number');
  });

  it('should handle undefined input correctly', async () => {
    const response = await executeECMA262Function('ToNumber', undefined);
    
    expect(response.success).toBe(true);
    expect(response.resultValue).toBe('NaN');
    expect(response.resultType).toBe('Number');
  });

  it('should handle array correctly', async () => {
    const response = await executeECMA262Function('ToNumber', [42]);
    
    expect(response.success).toBe(true);
    // Array [42] converts via ToPrimitive
    expect(response.resultType).toBe('Number');
    expect(response.resultValue).toBe('42');
  });

  it('should handle ToString with NaN input', async () => {
    const response = await executeECMA262Function('ToString', NaN);
    
    expect(response.success).toBe(true);
    expect(response.resultValue).toBe('NaN');
    expect(response.resultType).toBe('String');
  });

  it('should handle ToString with Infinity input', async () => {
    const response = await executeECMA262Function('ToString', Number.POSITIVE_INFINITY);
    
    expect(response.success).toBe(true);
    expect(response.resultValue).toBe('Infinity');
    expect(response.resultType).toBe('String');
  });

  it('should handle ToString with -Infinity input', async () => {
    const response = await executeECMA262Function('ToString', Number.NEGATIVE_INFINITY);
    
    expect(response.success).toBe(true);
    expect(response.resultValue).toBe('-Infinity');
    expect(response.resultType).toBe('String');
  });
});
