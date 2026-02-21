import { parseUserInput } from './utils/parseUserInput';
import { ToNumberExecutor } from './algorithms/executors';

describe('parseUserInput with valueOf', () => {
  it('should parse {valueOf: () => 1} correctly', () => {
    const input = '{valueOf: () => 1}';
    const parsed = parseUserInput(input);
    
    expect(parsed.type).toBe('Object');
    expect(typeof parsed.value).toBe('object');
    expect(typeof (parsed.value as any).valueOf).toBe('function');
  });

  it('should convert {valueOf: () => 1} to number 1', () => {
    const input = '{valueOf: () => 1}';
    const parsed = parseUserInput(input);
    
    const result = ToNumberExecutor.execute(parsed.value);
    
    expect(result.output).toBe(1);
    expect(result.success).toBe(true);
  });

  it('should parse {toString: () => "42"} correctly', () => {
    const input = '{toString: () => "42"}';
    const parsed = parseUserInput(input);
    
    expect(parsed.type).toBe('Object');
    expect(typeof parsed.value).toBe('object');
    expect(typeof (parsed.value as any).toString).toBe('function');
  });

  it('should convert {toString: () => "42"} to number 42', () => {
    const input = '{toString: () => "42"}';
    const parsed = parseUserInput(input);
    
    const result = ToNumberExecutor.execute(parsed.value);
    
    expect(result.output).toBe(42);
    expect(result.success).toBe(true);
  });
});
