import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ToNumberExecutor,
  StringToNumberExecutor,
  ToPrimitiveExecutor,
  OrdinaryToPrimitiveExecutor,
  TypeChecker,
} from './executors';

describe('Algorithm Executors', () => {
  describe('TypeChecker', () => {
    it('should correctly identify types', () => {
      expect(TypeChecker.getType(42)).toBe('number');
      expect(TypeChecker.getType('hello')).toBe('string');
      expect(TypeChecker.getType(true)).toBe('boolean');
      expect(TypeChecker.getType(null)).toBe('null');
      expect(TypeChecker.getType(undefined)).toBe('undefined');
      expect(TypeChecker.getType({})).toBe('object');
      expect(TypeChecker.getType([])).toBe('object');
    });

    it('should correctly identify if value is an object', () => {
      expect(TypeChecker.isObject({})).toBe(true);
      expect(TypeChecker.isObject([])).toBe(true);
      expect(TypeChecker.isObject(null)).toBe(false);
      expect(TypeChecker.isObject(42)).toBe(false);
      expect(TypeChecker.isObject('string')).toBe(false);
    });

    it('should correctly identify primitives', () => {
      expect(TypeChecker.isPrimitive(42)).toBe(true);
      expect(TypeChecker.isPrimitive('string')).toBe(true);
      expect(TypeChecker.isPrimitive({})).toBe(false);
      expect(TypeChecker.isPrimitive(null)).toBe(true);
    });

    it('should correctly identify callables', () => {
      expect(TypeChecker.isCallable(() => {})).toBe(true);
      expect(TypeChecker.isCallable(function () {})).toBe(true);
      expect(TypeChecker.isCallable(42)).toBe(false);
      expect(TypeChecker.isCallable('string')).toBe(false);
    });
  });

  describe('StringToNumberExecutor', () => {
    it('should convert empty string to 0', () => {
      const result = StringToNumberExecutor.execute('');
      expect(result.finalValue).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should convert numeric string to number', () => {
      const result = StringToNumberExecutor.execute('42');
      expect(result.finalValue).toBe(42);
      expect(result.success).toBe(true);
    });

    it('should convert string with spaces', () => {
      const result = StringToNumberExecutor.execute('  42  ');
      expect(result.finalValue).toBe(42);
      expect(result.success).toBe(true);
    });

    it('should convert Infinity string', () => {
      const result = StringToNumberExecutor.execute('Infinity');
      expect(result.finalValue).toBe(Infinity);
      expect(result.success).toBe(true);
    });

    it('should return NaN for invalid string', () => {
      const result = StringToNumberExecutor.execute('abc');
      expect(isNaN(result.finalValue as number)).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should have consistent trace structure', () => {
      const result = StringToNumberExecutor.execute('42');
      expect(result.algorithmId).toBe('stringToNumber');
      expect(result.algorithmName).toBe('StringToNumber');
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.input).toBe('42');
      expect(result.output).toBe(42);
    });

    it('should trace all steps', () => {
      const result = StringToNumberExecutor.execute('42');
      expect(result.steps.length).toBeGreaterThanOrEqual(2);
      // At least ParseText and Return step
    });
  });

  describe('ToNumberExecutor', () => {
    it('should return number as-is for step 1', () => {
      const result = ToNumberExecutor.execute(42);
      expect(result.finalValue).toBe(42);
      expect(result.success).toBe(true);
      expect(result.steps[0].kind).toBe('return');
    });

    it('should throw for symbol', () => {
      const result = ToNumberExecutor.execute(Symbol('test'));
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should throw for BigInt', () => {
      const result = ToNumberExecutor.execute(BigInt(42));
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return NaN for undefined', () => {
      const result = ToNumberExecutor.execute(undefined);
      expect(isNaN(result.finalValue as number)).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should return 0 for null', () => {
      const result = ToNumberExecutor.execute(null);
      expect(result.finalValue).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should return 0 for false', () => {
      const result = ToNumberExecutor.execute(false);
      expect(result.finalValue).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should return 1 for true', () => {
      const result = ToNumberExecutor.execute(true);
      expect(result.finalValue).toBe(1);
      expect(result.success).toBe(true);
    });

    it('should convert string via StringToNumber', () => {
      const result = ToNumberExecutor.execute('42');
      expect(result.finalValue).toBe(42);
      expect(result.success).toBe(true);
      // Should have nested trace for StringToNumber
      const stringStep = result.steps.find((s) => s.nestedTrace?.algorithmId === 'stringToNumber');
      expect(stringStep).toBeDefined();
    });

    it('should convert object via ToPrimitive', () => {
      const obj = {
        toString() {
          return '42';
        },
      };
      const result = ToNumberExecutor.execute(obj);
      expect(result.finalValue).toBe(42);
      expect(result.success).toBe(true);
    });

    it('should have nested ToPrimitive trace for objects', () => {
      const obj = { valueOf() { return 42; } };
      const result = ToNumberExecutor.execute(obj);
      const toPrimitiveStep = result.steps.find((s) => s.nestedTrace?.algorithmId === 'toPrimitive');
      expect(toPrimitiveStep).toBeDefined();
    });

    it('should have proper trace structure', () => {
      const result = ToNumberExecutor.execute(42);
      expect(result.algorithmId).toBe('toNumber');
      expect(result.algorithmName).toBe('ToNumber');
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.input).toBe(42);
      expect(result.output).toBe(42);
    });
  });

  describe('OrdinaryToPrimitiveExecutor', () => {
    it('should use toString-valueOf order for STRING hint', () => {
      const result = OrdinaryToPrimitiveExecutor.execute({ toString: () => 'str' }, 'string');
      expect(result.finalValue).toBe('str');
      expect(result.success).toBe(true);
    });

    it('should use valueOf-toString order for NUMBER hint', () => {
      const result = OrdinaryToPrimitiveExecutor.execute(
        { valueOf: () => 42 },
        'number',
      );
      expect(result.finalValue).toBe(42);
      expect(result.success).toBe(true);
    });

    it('should fall back to second method if first returns object', () => {
      const result = OrdinaryToPrimitiveExecutor.execute(
        {
          valueOf: () => ({}),
          toString: () => '42',
        },
        'number',
      );
      expect(result.finalValue).toBe('42');
      expect(result.success).toBe(true);
    });

    it('should throw TypeError if no method returns primitive', () => {
      const result = OrdinaryToPrimitiveExecutor.execute(
        {
          valueOf: () => ({}),
          toString: () => ({}),
        },
        'number',
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should have proper trace structure', () => {
      const result = OrdinaryToPrimitiveExecutor.execute({}, 'number');
      expect(result.algorithmId).toBe('ordinaryToPrimitive');
      expect(result.algorithmName).toBe('OrdinaryToPrimitive');
      expect(result.steps.length).toBeGreaterThan(0);
    });

    it('should skip non-callable properties', () => {
      const result = OrdinaryToPrimitiveExecutor.execute(
        {
          valueOf: 'not a function',
          toString: () => 'result',
        },
        'number',
      );
      expect(result.finalValue).toBe('result');
      expect(result.success).toBe(true);
    });
  });

  describe('ToPrimitiveExecutor', () => {
    it('should return primitive as-is', () => {
      const result = ToPrimitiveExecutor.execute(42);
      expect(result.finalValue).toBe(42);
      expect(result.success).toBe(true);
    });

    it('should return string primitive as-is', () => {
      const result = ToPrimitiveExecutor.execute('hello');
      expect(result.finalValue).toBe('hello');
      expect(result.success).toBe(true);
    });

    it('should use Symbol.toPrimitive if available', () => {
      const obj = {
        [Symbol.toPrimitive]: () => 'custom',
      };
      const result = ToPrimitiveExecutor.execute(obj, 'number');
      expect(result.finalValue).toBe('custom');
      expect(result.success).toBe(true);
    });

    it('should throw if Symbol.toPrimitive returns object', () => {
      const obj = {
        [Symbol.toPrimitive]: () => ({}),
      };
      const result = ToPrimitiveExecutor.execute(obj);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fall back to OrdinaryToPrimitive if no Symbol.toPrimitive', () => {
      const obj = {
        toString: () => 'str',
      };
      const result = ToPrimitiveExecutor.execute(obj, 'string');
      expect(result.finalValue).toBe('str');
      expect(result.success).toBe(true);
      const ordinaryStep = result.steps.find(
        (s) => s.nestedTrace?.algorithmId === 'ordinaryToPrimitive',
      );
      expect(ordinaryStep).toBeDefined();
    });

    it('should handle different preferred types', () => {
      const obj = {
        toString: () => 'str',
        valueOf: () => 42,
      };
      const resultString = ToPrimitiveExecutor.execute(obj, 'string');
      const resultNumber = ToPrimitiveExecutor.execute(obj, 'number');

      expect(resultString.success).toBe(true);
      expect(resultNumber.success).toBe(true);
    });

    it('should have proper trace structure', () => {
      const result = ToPrimitiveExecutor.execute(42);
      expect(result.algorithmId).toBe('toPrimitive');
      expect(result.algorithmName).toBe('ToPrimitive');
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.input).toBe(42);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex object coercion', () => {
      const obj = {
        valueOf() {
          return {};
        },
        toString() {
          return '42';
        },
      };

      const result = ToNumberExecutor.execute(obj);
      expect(result.finalValue).toBe(42);
      expect(result.success).toBe(true);
    });

    it('should trace nested algorithm calls', () => {
      const result = ToNumberExecutor.execute({ toString: () => '42' });
      expect(result.finalValue).toBe(42);

      // Check for nested traces
      const hasToPrimitive = result.steps.some((s) => s.nestedTrace?.algorithmId === 'toPrimitive');
      expect(hasToPrimitive).toBe(true);
    });

    it('should preserve step order in trace', () => {
      const result = ToNumberExecutor.execute(42);
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.steps[0].kind).toBe('return');
      expect(result.success).toBe(true);
    });
  });
});
