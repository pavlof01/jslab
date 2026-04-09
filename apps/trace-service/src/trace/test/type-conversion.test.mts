/**
 * Test for Vite - run with npm run test:owned
 *
 * This uses engine262's built-in test system
 */

import { describe, it, expect } from 'vitest';
import {
  Agent,
  NumberValue,
  setSurroundingAgent,
  R,
  callGenerator,
  Value,
  ToNumber,
  ToString,
  ToBoolean,
  ManagedRealm,
  NormalCompletion,
  ObjectValue,
} from '../index.mts';

describe('ToNumber преобразование через Realm', () => {
  it.skip('Generic: callGenerator со строкой "42"', () => {
    // eslint-disable-next-line no-console
    console.log('TEST');

    const agent = new Agent();
    setSurroundingAgent(agent);
    const stringValue = Value('42');
    const result = callGenerator(ToNumber(stringValue));
    // eslint-disable-next-line no-console
    console.log('callGenerator trace:', {
      entries: result.trace.getEntries(),
      stepCount: result.trace.getStepCount(),
    });
    expect(result).toBeInstanceOf(NumberValue);
    expect(R(result)).toBe(42);
  });

  it('Object: empty object {}) - ToNumber => NaN', () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const objResult = realm.evaluateScript('({})') as NormalCompletion<ObjectValue>;
    const objValue = objResult.Value;

    const result = callGenerator(ToNumber(objValue));

    expect(result).toBeInstanceOf(NumberValue);
    expect(result.isNaN()).toBe(true);
    expect(result.trace.getEntries().length).toBeGreaterThan(0);
    expect(result.trace.getStepCount()).toBeGreaterThan(0);
  });

  it('Object: empty object {} - ToString => "[object Object]"', () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const objResult = realm.evaluateScript('({})') as NormalCompletion<ObjectValue>;
    const objValue = objResult.Value;

    const result = callGenerator(ToString(objValue));

    expect(result.stringValue()).toBe('[object Object]');
    expect(result.trace.getEntries().length).toBeGreaterThan(0);
    expect(result.trace.getStepCount()).toBeGreaterThan(0);
  });

  it('Object: object with valueOf - ToNumber uses valueOf', () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    // Object with custom valueOf that returns 42
    const objResult = realm.evaluateScript('({ valueOf: () => 42 })') as NormalCompletion<ObjectValue>;
    const objValue = objResult.Value;

    const result = callGenerator(ToNumber(objValue));

    expect(result).toBeInstanceOf(NumberValue);
    expect(R(result)).toBe(42);
    // Check that conversion happened (trace should have entries)
    const entries = result.trace.getEntries();
    expect(entries.length).toBeGreaterThan(0);
    expect(result.trace.getStepCount()).toBeGreaterThan(0);
  });

  it('Object: object with toString - ToNumber uses toString', () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    // Object with custom toString that returns "99"
    const objResult = realm.evaluateScript('({ toString: () => "99" })') as NormalCompletion<ObjectValue>;
    const objValue = objResult.Value;

    const result = callGenerator(ToNumber(objValue));

    expect(result).toBeInstanceOf(NumberValue);
    expect(R(result)).toBe(99);
    expect(result.trace.getStepCount()).toBeGreaterThan(0);
  });

  it('Object: array [42] - ToNumber => 42', () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const objResult = realm.evaluateScript('[42]') as NormalCompletion<ObjectValue>;
    const objValue = objResult.Value;

    const result = callGenerator(ToNumber(objValue));

    expect(result).toBeInstanceOf(NumberValue);
    expect(R(result)).toBe(42);
    expect(result.trace.getStepCount()).toBeGreaterThan(0);
  });

  it('Object: array [1,2,3] - ToNumber => NaN', () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const objResult = realm.evaluateScript('[1,2,3]') as NormalCompletion<ObjectValue>;
    const objValue = objResult.Value;

    const result = callGenerator(ToNumber(objValue));

    expect(result).toBeInstanceOf(NumberValue);
    expect(result.isNaN()).toBe(true);
    expect(result.trace.getStepCount()).toBeGreaterThan(0);
  });

  it('Object: empty array [] - ToNumber => 0', () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const objResult = realm.evaluateScript('[]') as NormalCompletion<ObjectValue>;
    const objValue = objResult.Value;

    const result = callGenerator(ToNumber(objValue));

    expect(result).toBeInstanceOf(NumberValue);
    expect(R(result)).toBe(0);
    expect(result.trace.getStepCount()).toBeGreaterThan(0);
  });

  it('Object: ToBoolean always true for objects', () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const objResult = realm.evaluateScript('({})') as NormalCompletion<ObjectValue>;
    const objValue = objResult.Value;

    const result = ToBoolean(objValue);

    expect(result).toEqual(Value.true);
    expect(objValue.trace.getEntries().some((e) => e.algoId === 'ToBoolean')).toBe(true);
    expect(objValue.trace.getStepCount()).toBeGreaterThan(0);
  });

  it('Object: nested object with valueOf - trace shows delegation', () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const objResult = realm.evaluateScript('({ valueOf: () => ({ valueOf: () => 55 }) })') as NormalCompletion<ObjectValue>;
    const objValue = objResult.Value;

    const result = callGenerator(ToNumber(objValue));

    expect(result).toBeInstanceOf(NumberValue);
    const traceEntries = result.trace.getEntries();
    expect(traceEntries.length).toBeGreaterThan(0);
    // Check for conversion algorithm traces
    expect(traceEntries.some((e: { algoId: string; }) => e.algoId === 'ToNumber' || e.algoId === 'ToPrimitive')).toBe(true);
    expect(result.trace.getStepCount()).toBeGreaterThan(0);
  });

  it('Object with toString returning number string - ToNumber', () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const objResult = realm.evaluateScript('({ toString: () => "123", valueOf: () => 999 })') as NormalCompletion<ObjectValue>;
    const objValue = objResult.Value;

    const result = callGenerator(ToNumber(objValue));

    expect(result).toBeInstanceOf(NumberValue);
    // valueOf has priority for number hint
    expect(R(result)).toBe(999);
    expect(result.trace.getStepCount()).toBeGreaterThan(0);
  });

  it('Object: type conversion trace entries recorded', () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const objResult = realm.evaluateScript('({})') as NormalCompletion<ObjectValue>;
    const objValue = objResult.Value;

    const result = callGenerator(ToNumber(objValue));
    const entries = result.trace.getEntries();
    const stepCount = result.trace.getStepCount();

    // Should have operation entry for ToNumber on object
    const hasToNumberEntry = entries.some((e: { algoId: string; }) => e.algoId === 'ToNumber');
    expect(hasToNumberEntry).toBe(true);

    // Should have at least one trace entry for the ToNumber algorithm
    expect(entries.length).toBeGreaterThanOrEqual(1);

    // Should have recorded multiple steps (indicating nested algorithm calls)
    expect(stepCount).toBeGreaterThan(1);
  });
});
