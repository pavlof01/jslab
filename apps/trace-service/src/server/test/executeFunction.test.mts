/**
 * Integration test for HTTP API - corner cases
 */
import { describe, it, expect } from 'vitest';
import { executeECMA262Function } from '../execute/index.ts';

describe('executeECMA262Function - corner cases', () => {
  it('should handle NaN correctly for ToNumber("abc")', async () => {
    const response = await executeECMA262Function('ToNumber', 'abc');

    expect(response.success).toBe(true);
    expect(response.functionName).toBe('ToNumber');
    expect(response.result).toEqual({ type: 'Number', value: 'NaN' });
  });

  it('should handle Infinity for ToNumber("Infinity")', async () => {
    const response = await executeECMA262Function('ToNumber', 'Infinity');

    expect(response.success).toBe(true);
    expect(response.functionName).toBe('ToNumber');
    expect(response.result).toEqual({ type: 'Number', value: Infinity });
  });

  it('should handle numeric string correctly', async () => {
    const response = await executeECMA262Function('ToNumber', 42);

    expect(response.success).toBe(true);
    expect(response.functionName).toBe('ToNumber');
    expect(response.result).toEqual({ type: 'Number', value: 42 });
  });

  it('should handle empty string for ToNumber("")', async () => {
    const response = await executeECMA262Function('ToNumber', '');

    expect(response.success).toBe(true);
    expect(response.functionName).toBe('ToNumber');
    expect(response.result).toEqual({ type: 'Number', value: 0 });
  });

  it('should handle whitespace string for ToNumber', async () => {
    const response = await executeECMA262Function('ToNumber', '   ');

    expect(response.success).toBe(true);
    expect(response.functionName).toBe('ToNumber');
    expect(response.result).toEqual({ type: 'Number', value: 0 });
  });

  it('should handle null input correctly', async () => {
    const response = await executeECMA262Function('ToNumber', null);

    expect(response.success).toBe(true);
    expect(response.result).toEqual({ type: 'Number', value: 0 });
  });

  it('should handle undefined input correctly', async () => {
    const response = await executeECMA262Function('ToNumber', undefined);

    expect(response.success).toBe(true);
    expect(response.result).toEqual({ type: 'Number', value: 'NaN' });
  });

  it('should handle array correctly', async () => {
    const response = await executeECMA262Function('ToNumber', [42]);

    expect(response.success).toBe(true);
    expect(response.result).toMatchObject({ type: 'Number', value: 42 });
  });

  it('should handle ToString with NaN input', async () => {
    const response = await executeECMA262Function('ToString', NaN);

    expect(response.success).toBe(true);
    expect(response.result).toEqual({ type: 'String', value: 'NaN' });
  });

  it('should handle ToString with Infinity input', async () => {
    const response = await executeECMA262Function('ToString', Number.POSITIVE_INFINITY);

    expect(response.success).toBe(true);
    expect(response.result).toEqual({ type: 'String', value: 'Infinity' });
  });

  it('should handle ToString with -Infinity input', async () => {
    const response = await executeECMA262Function('ToString', Number.NEGATIVE_INFINITY);

    expect(response.success).toBe(true);
    expect(response.result).toEqual({ type: 'String', value: '-Infinity' });
  });
});
