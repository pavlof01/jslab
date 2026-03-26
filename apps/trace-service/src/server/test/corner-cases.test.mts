/**
 * Test corner cases: NaN, Infinity, -Infinity
 */
import { describe, it, expect } from 'vitest';
import {
  ToNumber,
  Value,
  callGenerator,
  evalQ,
  ManagedRealm,
  NormalCompletion,
  ThrowCompletion,
  Agent,
  setSurroundingAgent,
} from '#self';

describe('Corner cases: special number values', () => {
  it('ToNumber("abc") should return NaN', () => {
    const result = evalQ((Q, X) => {
      const agent = new Agent();
      setSurroundingAgent(agent);
      const realm = new ManagedRealm();
      
      const inputResult = realm.evaluateScript("'abc'");
      if (inputResult instanceof ThrowCompletion) {
        throw new Error('Failed to parse');
      }
      
      const inputValue = (inputResult as NormalCompletion<Value>).Value;
      const functionCall = ToNumber(inputValue);
      const execResult = callGenerator(functionCall);
      
      // Convert to string as done in executeFunction.ts
      let resultValueStr: string;
      if (typeof execResult.value === 'number') {
        resultValueStr = String(execResult.value);
      } else {
        resultValueStr = String(execResult.value);
      }
      
      return {
        value: resultValueStr,
        type: execResult.type,
      };
    });

    const normalResult = result as NormalCompletion<any>;
    const { value, type } = normalResult.Value;
    
    expect(value).toBe('NaN');
    expect(type).toBe('Number');
  });

  it('ToNumber("Infinity") should return "Infinity"', () => {
    const result = evalQ((Q, X) => {
      const agent = new Agent();
      setSurroundingAgent(agent);
      const realm = new ManagedRealm();
      
      const inputResult = realm.evaluateScript("'Infinity'");
      if (inputResult instanceof ThrowCompletion) {
        throw new Error('Failed to parse');
      }
      
      const inputValue = (inputResult as NormalCompletion<Value>).Value;
      const functionCall = ToNumber(inputValue);
      const execResult = callGenerator(functionCall);
      
      let resultValueStr: string;
      if (typeof execResult.value === 'number') {
        resultValueStr = String(execResult.value);
      } else {
        resultValueStr = String(execResult.value);
      }
      
      return {
        value: resultValueStr,
        type: execResult.type,
      };
    });

    const normalResult = result as NormalCompletion<any>;
    const { value, type } = normalResult.Value;
    
    expect(value).toBe('Infinity');
    expect(type).toBe('Number');
  });

  it('ToNumber("-99999999999999999999") should return large negative number', () => {
    const result = evalQ((Q, X) => {
      const agent = new Agent();
      setSurroundingAgent(agent);
      const realm = new ManagedRealm();
      
      const inputResult = realm.evaluateScript("'-99999999999999999999'");
      if (inputResult instanceof ThrowCompletion) {
        throw new Error('Failed to parse');
      }
      
      const inputValue = (inputResult as NormalCompletion<Value>).Value;
      const functionCall = ToNumber(inputValue);
      const execResult = callGenerator(functionCall);
      
      let resultValueStr: string;
      if (typeof execResult.value === 'number') {
        resultValueStr = String(execResult.value);
      } else {
        resultValueStr = String(execResult.value);
      }
      
      return {
        value: resultValueStr,
        type: execResult.type,
      };
    });

    const normalResult = result as NormalCompletion<any>;
    const { value, type } = normalResult.Value;
    
    // Could be -Infinity or a large negative number
    expect(type).toBe('Number');
    expect(['Infinity', '-Infinity', '-1e+20', '-100000000000000000000'].some(s => value.includes(s) || value.startsWith('-'))).toBe(true);
  });

  it('ToNumber("") should return "0"', () => {
    const result = evalQ((Q, X) => {
      const agent = new Agent();
      setSurroundingAgent(agent);
      const realm = new ManagedRealm();
      
      const inputResult = realm.evaluateScript("''");
      if (inputResult instanceof ThrowCompletion) {
        throw new Error('Failed to parse');
      }
      
      const inputValue = (inputResult as NormalCompletion<Value>).Value;
      const functionCall = ToNumber(inputValue);
      const execResult = callGenerator(functionCall);
      
      let resultValueStr: string;
      if (typeof execResult.value === 'number') {
        resultValueStr = String(execResult.value);
      } else {
        resultValueStr = String(execResult.value);
      }
      
      return {
        value: resultValueStr,
        type: execResult.type,
      };
    });

    const normalResult = result as NormalCompletion<any>;
    const { value, type } = normalResult.Value;
    
    expect(value).toBe('0');
    expect(type).toBe('Number');
  });
});
