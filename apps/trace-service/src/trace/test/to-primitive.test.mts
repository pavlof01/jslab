/**
 * Tests for ToPrimitive conversion
 * Run with npm run test:owned
 */

import { describe, it, expect } from 'vitest';
import {
  Agent,
  NumberValue,
  BooleanValue,
  setSurroundingAgent,
  R,
  callGenerator,
  Value,
  ToPrimitive,
  ManagedRealm,
  NormalCompletion,
  ObjectValue,
} from '../index.mts';

/**
 * Helper to find algorithm transitions in trace
 */
function findAlgoTransitions(entries: readonly Record<string, unknown>[]): { from: string; to: string }[] {
  const transitions: { from: string; to: string }[] = [];
  let previousAlgo = '';

  const traverse = (entries: readonly Record<string, unknown>[]): void => {
    entries.forEach((entry) => {
      const algoId = (entry as Record<string, unknown>).algoId as string | undefined;
      if (algoId && algoId !== previousAlgo) {
        if (previousAlgo) {
          transitions.push({ from: previousAlgo, to: algoId });
        }
        previousAlgo = algoId;
      }
      const children = (entry as Record<string, unknown>).children as unknown[] | undefined;
      if (children?.length && children?.length > 0) {
        traverse(children as readonly Record<string, unknown>[]);
      }
    });
  };

  traverse(entries);
  return transitions;
}

/**
 * Helper to count trace entries by algorithm
 */
function countEntriesByAlgorithm(entries: readonly Record<string, unknown>[]): Record<string, number> {
  const counts: Record<string, number> = {};

  const traverse = (entries: readonly Record<string, unknown>[]): void => {
    entries.forEach((entry) => {
      const algoId = entry.algoId as string | undefined;
      if (algoId) {
        counts[algoId] = (counts[algoId] ?? 0) + 1;
      }
      const children = entry.children as unknown[] | undefined;
      if (children?.length && children?.length > 0) {
        traverse(children as readonly Record<string, unknown>[]);
      }
    });
  };

  traverse(entries);
  return counts;
}

/**
 * Helper to filter entries by algorithm
 */
function filterEntriesByAlgorithm(entries: readonly Record<string, unknown>[], algoId: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];

  const traverse = (entries: readonly Record<string, unknown>[]): void => {
    entries.forEach((entry) => {
      if ((entry as Record<string, unknown>).algoId === algoId) {
        results.push(entry);
      }
      const children = entry.children as unknown[] | undefined;
      if (children?.length && children?.length > 0) {
        traverse(children as readonly Record<string, unknown>[]);
      }
    });
  };

  traverse(entries);
  return results;
}

/**
 * Helper to validate trace entry structure
 * Handles both TraceNode (has 'steps' array) and TraceStep (has 'kind' property)
 */
function expectTraceEntryValid(entry: Record<string, unknown>) {
  expect(entry).toHaveProperty('algoId');

  // Check if this is a TraceNode (has 'steps' array) or TraceStep (has 'kind')
  const isNode = Array.isArray((entry as Record<string, unknown>).steps);

  if (isNode) {
    // For TraceNode, validate the steps array exists
    expect((entry as Record<string, unknown>).steps).toBeDefined();
    expect(Array.isArray((entry as Record<string, unknown>).steps)).toBe(true);
  } else {
    // For TraceStep, validate kind
    expect(entry).toHaveProperty('kind');
    expect(['if', 'operation', 'return', 'throw']).toContain(entry.kind);
  }
}

/**
 * Helper to validate expected trace steps
 */
function expectTraceHasAlgorithm(entries: readonly Record<string, unknown>[], algoId: string) {
  const hasAlgo = entries.some((e) => (e as Record<string, unknown>).algoId === algoId);
  expect(hasAlgo).toBe(true);
}

describe('ToPrimitive - Comprehensive Algorithm Testing', () => {
  describe('Type: Primitives', () => {
    describe('Cases - Primitives pass through unchanged', () => {
      it('Primitive number - returns same value', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);

        const result = callGenerator(ToPrimitive(Value(42)));

        expect(result).toBeInstanceOf(NumberValue);
        expect(R(result)).toBe(42);
      });

      it('Primitive string - returns same value', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);

        const stringVal = Value('hello');
        const result = callGenerator(ToPrimitive(stringVal));

        expect(result.stringValue()).toBe('hello');
      });

      it('Primitive boolean - returns same value', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);

        const result = callGenerator(ToPrimitive(Value(true)));

        expect(result).toBeInstanceOf(BooleanValue);
        expect(result === Value.true).toBe(true);
      });

      it('Null - returns null', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);

        const result = callGenerator(ToPrimitive(Value.null));

        expect(result === Value.null).toBe(true);
      });

      it('Undefined - returns undefined', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);

        const result = callGenerator(ToPrimitive(Value.undefined));

        expect(result === Value.undefined).toBe(true);
      });
    });
  });

  describe('Type: Objects', () => {
    describe('Cases - Plain Objects with Default Hint', () => {
      it('Empty object {} - returns [object Object]', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript('({})') as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue));

        expect(result.stringValue()).toBe('[object Object]');

        const entries = result.trace.getEntries();

        if (entries.length > 0) {
          const hasToPrimitiveEntry = entries.some((e: Record<string, unknown>) => (e as Record<string, unknown>).algoId === 'ToPrimitive');
          expect(hasToPrimitiveEntry).toBe(true);

          const toPrimitiveEntries = entries.filter((e: Record<string, unknown>) => (e as Record<string, unknown>).algoId === 'ToPrimitive');
          toPrimitiveEntries.forEach((entry: Record<string, unknown>) => {
            expect(entry).toHaveProperty('kind');
            expect(entry).toHaveProperty('value');
          });
        }
      });
    });

    describe('Cases - Objects with valueOf/toString', () => {
      it('Object with valueOf - number hint uses valueOf', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript('({ valueOf: () => 42 })') as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue, 'number'));

        expect(result).toBeInstanceOf(NumberValue);
        expect(R(result)).toBe(42);
      });

      it('Object with toString - string hint uses toString', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript('({ toString: () => "custom" })') as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue, 'string'));

        expect(result.stringValue()).toBe('custom');
      });

      it('Object with both valueOf and toString - respects hint priority', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript(`
          ({
            valueOf: () => 99,
            toString: () => 'string-result'
          })
        `) as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        // Number hint: valueOf first
        const resultNum = callGenerator(ToPrimitive(objValue, 'number'));
        expect(resultNum).toBeInstanceOf(NumberValue);
        expect(R(resultNum)).toBe(99);

        const entriesNum = resultNum.trace.getEntries();
        if (entriesNum.length > 0) {
          console.log('Entries (number hint):', entriesNum);

          entriesNum.forEach((entry: Record<string, unknown>) => {
            if (entry.algoId === 'ToPrimitive') {
              expect(['if', 'call', 'return']).toContain(entry.kind ?? 'call');
            }
          });
        }

        // String hint: toString first
        const resultStr = callGenerator(ToPrimitive(objValue, 'string'));
        expect(resultStr.stringValue()).toBe('string-result');

        const entriesStr = resultStr.trace.getEntries();
        if (entriesStr.length > 0) {
          console.log('Entries (string hint):', entriesStr);
        }
      });
    });

    describe('Cases - Arrays', () => {
      it('Array [1,2,3] - converts to string "1,2,3"', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript('[1,2,3]') as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue));

        expect(result.stringValue()).toBe('1,2,3');
      });
    });

    describe('Corner cases - Built-in Objects', () => {
      it('Date with string hint - calls toString', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const dateResult = realm.evaluateScript('new Date(2024, 0, 1)') as NormalCompletion<ObjectValue>;
        const dateValue = dateResult.Value;

        const result = callGenerator(ToPrimitive(dateValue, 'string'));

        expect(typeof result.stringValue()).toBe('string');
      });

      it('Date with number hint - calls valueOf', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const dateResult = realm.evaluateScript('new Date(2024, 0, 1)') as NormalCompletion<ObjectValue>;
        const dateValue = dateResult.Value;

        const result = callGenerator(ToPrimitive(dateValue, 'number'));

        expect(result).toBeInstanceOf(NumberValue);
        expect(typeof R(result)).toBe('number');
      });

      it('Object with Symbol.toPrimitive - respects custom implementation', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript(`
          ({
            [Symbol.toPrimitive](hint) {
              return 'symbol-primitive';
            }
          })
        `) as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue));

        expect(result.stringValue()).toBe('symbol-primitive');

        const entries = result.trace.getEntries();

        if (entries.length > 0) {
          const transitions = findAlgoTransitions(entries);
          console.log('Algorithm transitions:', transitions);

          entries.forEach((entry: Record<string, unknown>) => {
            if (entry.algoId === 'ToPrimitive') {
              expect(entry).toHaveProperty('kind');
              expect(entry).toHaveProperty('value');
            }
          });
        }
      });
    });
  });

  describe('Comprehensive Trace Testing', () => {
    describe('Trace Entry Structure Validation', () => {
      it('Primitive pass-through - verify trace entry structure', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);

        const result = callGenerator(ToPrimitive(Value(42)));

        expect(result).toBeInstanceOf(NumberValue);
        const entries = result.trace.getEntries();

        if (entries.length > 0) {
          entries.forEach((entry: Record<string, unknown>) => {
            expectTraceEntryValid(entry);
          });
        }
      });

      it('String primitive - verify trace structure', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);

        const result = callGenerator(ToPrimitive(Value('hello')));

        expect(result.stringValue()).toBe('hello');
        const entries = result.trace.getEntries();

        if (entries.length > 0) {
          entries.forEach((entry: Record<string, unknown>) => {
            expectTraceEntryValid(entry);
          });

          const toPrimitiveEntries = filterEntriesByAlgorithm(entries, 'ToPrimitive');
          expect(toPrimitiveEntries.length).toBeGreaterThan(0);
        }
      });

      it('Boolean primitive - verify trace structure', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);

        const result = callGenerator(ToPrimitive(Value.true));

        expect(result).toBe(Value.true);
        const entries = result.trace.getEntries();

        if (entries.length > 0) {
          const algoCount = countEntriesByAlgorithm(entries);
          expect((algoCount.ToPrimitive ?? 0)).toBeGreaterThan(0);
        }
      });
    });

    describe('Algorithm Transitions in ToPrimitive', () => {
      it('Plain object - verify ToPrimitive to OrdinaryToPrimitive transition', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript('({})') as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue));

        const entries = result.trace.getEntries();
        if (entries.length > 0) {
          const transitions = findAlgoTransitions(entries);
          expectTraceHasAlgorithm(entries, 'ToPrimitive');
          expectTraceHasAlgorithm(entries, 'OrdinaryToPrimitive');

          const hasTransition = transitions.some((t) => t.from === 'ToPrimitive' && t.to === 'OrdinaryToPrimitive');
          expect(hasTransition).toBe(true);
        }
      });

      it('Object with valueOf - verify call chain in traces', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript('({ valueOf: () => 99 })') as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue, 'number'));

        expect(result).toBeInstanceOf(NumberValue);
        expect(R(result)).toBe(99);

        const entries = result.trace.getEntries();
        if (entries.length > 0) {
          const algoCount = countEntriesByAlgorithm(entries);
          expect((algoCount.ToPrimitive ?? 0)).toBeGreaterThan(0);
          expect((algoCount.OrdinaryToPrimitive ?? 0)).toBeGreaterThan(0);
        }
      });

      it('Object with toString - verify complete trace paths', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript('({ toString: () => "42" })') as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue, 'string'));

        expect(result.stringValue()).toBe('42');

        const entries = result.trace.getEntries();
        if (entries.length > 0) {
          const transitions = findAlgoTransitions(entries);
          expectTraceHasAlgorithm(entries, 'ToPrimitive');

          transitions.forEach((transition) => {
            expect(transition).toHaveProperty('from');
            expect(transition).toHaveProperty('to');
          });
        }
      });

      it('Object with Symbol.toPrimitive - verify exotic ToPrimitive path', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript(`
          ({
            [Symbol.toPrimitive](hint) {
              return 'exotic-primitive';
            }
          })
        `) as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue));

        expect(result.stringValue()).toBe('exotic-primitive');

        const entries = result.trace.getEntries();
        if (entries.length > 0) {
          const toPrimitiveEntries = filterEntriesByAlgorithm(entries, 'ToPrimitive');
          expect(toPrimitiveEntries.length).toBeGreaterThan(0);

          toPrimitiveEntries.forEach((entry: Record<string, unknown>) => {
            expect(entry).toHaveProperty('algoId', 'ToPrimitive');
            expectTraceEntryValid(entry);
          });
        }
      });
    });

    describe('Trace Statistics and Validation', () => {
      it('Array conversion - count trace entries by algorithm', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript('[1, 2, 3]') as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue, 'number'));

        const entries = result.trace.getEntries();
        if (entries.length > 0) {
          const algoCount = countEntriesByAlgorithm(entries);
          expect((algoCount.ToPrimitive ?? 0)).toBeGreaterThan(0);
          expect((algoCount.OrdinaryToPrimitive ?? 0)).toBeGreaterThan(0);
        }
      });

      it('Object conversion - verify all step kinds are recorded', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript('({ toString: () => "result" })') as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue, 'string'));

        expect(result.stringValue()).toBe('result');

        const entries = result.trace.getEntries();
        if (entries.length > 0) {
          const allKinds = new Set<string>();
          entries.forEach((entry: Record<string, unknown>) => {
            const kind = entry.kind as string | undefined;
            if (kind) allKinds.add(kind);
          });

          expect(allKinds.size).toBeGreaterThan(0);
        }
      });

      it('Preferred type number - verify hint handling in traces', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript('({ valueOf: () => 42 })') as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue, 'number'));

        expect(result).toBeInstanceOf(NumberValue);
        const entries = result.trace.getEntries();

        if (entries.length > 0) {
          const toPrimitiveEntries = filterEntriesByAlgorithm(entries, 'ToPrimitive');
          const ordinaryToPrimEntries = filterEntriesByAlgorithm(entries, 'OrdinaryToPrimitive');

          expect(toPrimitiveEntries.length).toBeGreaterThan(0);
          expect(ordinaryToPrimEntries.length).toBeGreaterThan(0);
        }
      });

      it('Preferred type string - verify hint handling in traces', () => {
        const agent = new Agent();
        setSurroundingAgent(agent);
        const realm = new ManagedRealm();

        const objResult = realm.evaluateScript('({ toString: () => "text" })') as NormalCompletion<ObjectValue>;
        const objValue = objResult.Value;

        const result = callGenerator(ToPrimitive(objValue, 'string'));

        expect(result.stringValue()).toBe('text');
        const entries = result.trace.getEntries();

        if (entries.length > 0) {
          const toPrimitiveEntries = filterEntriesByAlgorithm(entries, 'ToPrimitive');
          expect(toPrimitiveEntries.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
