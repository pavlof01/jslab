import {
  UndefinedValue, JSStringValue, SymbolValue,
  ObjectValue,
  Value,
  NumberValue,
  BigIntValue,
  wellKnownSymbols,
  NullValue,
  BooleanValue,
  PrimitiveValue,
  type PropertyKeyValue,
} from '../value.mts';
import {
  surroundingAgent,
} from '../host-defined/engine.mts';
import {
  Q, X,
  type ValueCompletion,
} from '../completion.mts';
import { OutOfRange, type Mutable } from '../helpers.mts';
import { MV_StringNumericLiteral } from '../runtime-semantics/all.mts';
import type { BooleanObject } from '../intrinsics/Boolean.mts';
import type { NumberObject } from '../intrinsics/Number.mts';
import type { SymbolObject } from '../intrinsics/Symbol.mts';
import type { BigIntObject } from '../intrinsics/BigInt.mts';
import type { PlainEvaluator, ValueEvaluator } from '../evaluator.mts';
import { createTraceEntryFromValue } from '../trace-builder.mts';
import {
  Assert,
  Call,
  Get,
  GetMethod,
  IsCallable,
  OrdinaryObjectCreate,
  SameValue,
  StringCreate,
  Z,
  F, R,
} from './all.mts';

/** https://tc39.es/ecma262/#sec-toprimitive */
export function* ToPrimitive(input: Value, preferredType?: 'string' | 'number'): ValueEvaluator<PrimitiveValue> {
  const traceEntry = createTraceEntryFromValue({ argument: input, algoId: 'ToPrimitive' });

  // 1. Assert: input is an ECMAScript language value.
  Assert(input instanceof Value);
  // 2. If Type(input) is Object, then
  if (input instanceof ObjectValue) {
    traceEntry({ kind: 'if', hint: 'If input is Object, try exotic ToPrimitive.' });
    // a. Let exoticToPrim be ? GetMethod(input, @@toPrimitive).
    const exoticToPrim = Q(yield* GetMethod(input, wellKnownSymbols.toPrimitive));
    // b. If exoticToPrim is not undefined, then
    if (exoticToPrim !== Value.undefined) {
      traceEntry({ kind: 'operation', hint: 'Call exotic @@toPrimitive method.' });
      let hint;
      // i. If preferredType is not present, let hint be "default".
      if (preferredType === undefined) {
        hint = Value('default');
      } else if (preferredType === 'string') { // ii. Else if preferredType is string, let hint be "string".
        hint = Value('string');
      } else { // iii. Else,
        // 1. Assert: preferredType is number.
        Assert(preferredType === 'number');
        // 2. Let hint be "number".
        hint = Value('number');
      }
      // iv. Let result be ? Call(exoticToPrim, input, « hint »).
      const result = Q(yield* Call(exoticToPrim, input, [hint]));
      // v. If Type(result) is not Object, return result.
      if (!(result instanceof ObjectValue)) {
        traceEntry({ kind: 'return', hint: 'Exotic ToPrimitive returned primitive.' });
        return result;
      }
      // vi. Throw a TypeError exception.
      traceEntry({ kind: 'throw', hint: 'Exotic ToPrimitive returned object - throw TypeError.' });
      return surroundingAgent.Throw('TypeError', 'ObjectToPrimitive');
    }
    // c. If preferredType is not present, let preferredType be number.
    if (preferredType === undefined) {
      preferredType = 'number';
    }
    // d. Return ? OrdinaryToPrimitive(input, preferredType).
    traceEntry({ kind: 'operation', hint: `Call OrdinaryToPrimitive with hint "${preferredType}".` });
    return Q(yield* OrdinaryToPrimitive(input, preferredType));
  }
  // 3. Return input.
  traceEntry({ kind: 'return', hint: 'Input is already primitive, return as-is.' });
  return input;
}

/** https://tc39.es/ecma262/#sec-ordinarytoprimitive */
export function* OrdinaryToPrimitive(O: ObjectValue, hint: 'string' | 'number'): ValueEvaluator<PrimitiveValue> {
  const traceEntry = createTraceEntryFromValue({ argument: O, algoId: 'OrdinaryToPrimitive' });

  // 1. Assert: Type(O) is Object.
  Assert(O instanceof ObjectValue);
  // 2. Assert: hint is either string or number.
  Assert(hint === 'string' || hint === 'number');
  let methodNames;
  // 3. If hint is string, then
  if (hint === 'string') {
    traceEntry({ kind: 'operation', hint: 'Try methods in order: toString, valueOf.' });
    // a. Let methodNames be « "toString", "valueOf" ».
    methodNames = [Value('toString'), Value('valueOf')];
  } else { // 4. Else,
    traceEntry({ kind: 'operation', hint: 'Try methods in order: valueOf, toString.' });
    // a. Let methodNames be « "valueOf", "toString" ».
    methodNames = [Value('valueOf'), Value('toString')];
  }
  // 5. For each element name of methodNames, do
  for (const name of methodNames) {
    // a. Let method be ? Get(O, name).
    const method = Q(yield* Get(O, name));
    // b. If IsCallable(method) is true, then
    if (IsCallable(method)) {
      traceEntry({ kind: 'operation', hint: `Method ${(name as JSStringValue).stringValue()} is callable, calling it.` });
      // i. Let result be ? Call(method, O).
      const result = Q(yield* Call(method, O));
      // ii. If Type(result) is not Object, return result.
      if (!(result instanceof ObjectValue)) {
        traceEntry({ kind: 'return', hint: `Method ${(name as JSStringValue).stringValue()} returned primitive.` });
        return result;
      }
    } else {
      traceEntry({ kind: 'if', hint: `Method ${(name as JSStringValue).stringValue()} not callable, try next.` });
    }
  }
  // 6. Throw a TypeError exception.
  traceEntry({ kind: 'throw', hint: 'No method returned primitive - throw TypeError.' });
  return surroundingAgent.Throw('TypeError', 'ObjectToPrimitive');
}

/** https://tc39.es/ecma262/#sec-toboolean */
export function ToBoolean(argument: Value): BooleanValue {
  if (argument instanceof UndefinedValue) {
    argument.trace.addEntry({
      algoId: 'ToBoolean',
      kind: 'return',
      value: 'false',
      type: argument.type,
      hint: 'If argument is undefined, return false.',
    });
    // Return false.
    return Value.false;
  } else if (argument instanceof NullValue) {
    argument.trace.addEntry({
      algoId: 'ToBoolean',
      kind: 'return',
      value: 'false',
      type: argument.type,
      hint: 'If argument is null, return false.',
    });
    // Return false.
    return Value.false;
  } else if (argument instanceof BooleanValue) {
    argument.trace.addEntry({
      algoId: 'ToBoolean',
      kind: 'return',
      value: argument === Value.true ? 'true' : 'false',
      type: argument.type,
      hint: 'Argument is already boolean, return as-is.',
    });
    // Return argument.
    return argument;
  } else if (argument instanceof NumberValue) {
    argument.trace.addEntry({
      algoId: 'ToBoolean',
      kind: 'if',
      value: String(R(argument)),
      type: argument.type,
      hint: 'If number is +0, -0, or NaN, return false; otherwise true.',
    });
    // If argument is +0𝔽, -0𝔽, or NaN, return false; otherwise return true.
    if (R(argument) === 0 || argument.isNaN()) {
      return Value.false;
    }
  } else if (argument instanceof JSStringValue) {
    argument.trace.addEntry({
      algoId: 'ToBoolean',
      kind: 'if',
      value: argument.stringValue(),
      type: argument.type,
      hint: 'If string is empty, return false; otherwise true.',
    });
    // If argument is the empty String, return false; otherwise return true.
    if (argument.stringValue().length === 0) {
      return Value.false;
    }
  } else if (argument instanceof BigIntValue) {
    argument.trace.addEntry({
      algoId: 'ToBoolean',
      kind: 'if',
      value: String(R(argument)),
      type: argument.type,
      hint: 'If BigInt is 0ℤ, return false; otherwise true.',
    });
    // If argument is 0ℤ, return false; otherwise return true.
    if (R(argument) === 0n) {
      return Value.false;
    }
  } else if (argument instanceof SymbolValue) {
    argument.trace.addEntry({
      algoId: 'ToBoolean',
      kind: 'return',
      value: 'true',
      type: argument.type,
      hint: 'Symbol always converts to true.',
    });
  } else if (argument instanceof ObjectValue) {
    argument.trace.addEntry({
      algoId: 'ToBoolean',
      kind: 'return',
      value: 'true',
      type: argument.type,
      hint: 'Object always converts to true.',
    });
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-tonumeric */
export function* ToNumeric(value: Value): ValueEvaluator<NumberValue | BigIntValue> {
  const traceEntry = createTraceEntryFromValue({ argument: value, algoId: 'ToNumeric' });

  // 1. Let primValue be ? ToPrimitive(value, number).
  traceEntry({ kind: 'operation', hint: 'Call ToPrimitive with hint "number".' });
  const primValue = Q(yield* ToPrimitive(value, 'number'));
  // 2. If Type(primValue) is BigInt, return primValue.
  if (primValue instanceof BigIntValue) {
    traceEntry({ kind: 'return', hint: 'Result is BigInt, return as-is.' });
    return primValue;
  }
  // 3. Return ? ToNumber(primValue).
  traceEntry({ kind: 'operation', hint: 'Result is not BigInt, call ToNumber.' });
  return Q(yield* ToNumber(primValue));
}

/** https://tc39.es/ecma262/#sec-tonumber */
export function* ToNumber(argument: Value): ValueEvaluator<NumberValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToNumber' });
  
  if (argument instanceof UndefinedValue) {
    traceEntry({ kind: 'return', hint: 'If argument is undefined, return NaN.' });
    return F(NaN);
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is undefined, return NaN.' });
  }

  if (argument instanceof NullValue) {
    traceEntry({ kind: 'return', hint: 'If argument is null, return +0.' });
    const result = F(+0);
    result.trace = argument.trace;
    return result;
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is null, return +0.' });
  }

  if (argument instanceof BooleanValue) {
    const boolValue = argument === Value.true ? 1 : 0;
    traceEntry({ kind: 'return', hint: `If argument is ${argument === Value.true ? 'true' : 'false'}, return ${boolValue}.` });
    const result = F(boolValue);
    result.trace = argument.trace;
    return result;
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is boolean, convert to 1 or 0.' });
  }

  if (argument instanceof NumberValue) {
    traceEntry({ kind: 'return', hint: 'Argument is already a number, return as-is.' });
    return argument;
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is number, return as-is.' });
  }

  if (argument instanceof JSStringValue) {
    traceEntry({ kind: 'operation', hint: `Convert string "${argument.stringValue()}" to number.` });
    const result = MV_StringNumericLiteral(argument.stringValue());
    result.trace = argument.trace;
    return result;
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is string, apply MV_StringNumericLiteral.' });
  }

  if (argument instanceof BigIntValue) {
    traceEntry({ kind: 'throw', hint: 'Cannot convert BigInt to Number - throw TypeError.' });
    return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is BigInt, throw TypeError.' });
  }

  if (argument instanceof SymbolValue) {
    traceEntry({ kind: 'throw', hint: 'Cannot convert Symbol to Number - throw TypeError.' });
    return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'number');
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is Symbol, throw TypeError.' });
  }

  if (argument instanceof ObjectValue) {
    traceEntry({ kind: 'operation', hint: 'Convert object to primitive then recurse ToNumber.' });
    const primValue = Q(yield* ToPrimitive(argument, 'number'));
    return Q(yield* ToNumber(primValue));
  }

  throw new OutOfRange('ToNumber', { argument });
}

const mod = (n: number, m: number) => {
  const r = n % m;
  return Math.floor(r >= 0 ? r : r + m);
};

/** https://tc39.es/ecma262/#sec-tointegerorinfinity */
export function* ToIntegerOrInfinity(argument: Value): PlainEvaluator<number> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToIntegerOrInfinity' });

  // 1. Let number be ? ToNumber(argument).
  traceEntry({ kind: 'operation', hint: 'Call ToNumber.' });
  const number = Q(yield* ToNumber(argument));
  // 2. If number is NaN, +0𝔽, or -0𝔽, return 0.
  if (number.isNaN() || R(number) === 0) {
    traceEntry({ kind: 'return', hint: 'Number is NaN or ±0, return 0.' });
    return +0;
  }
  // 3. If number is +∞𝔽, return +∞.
  // 4. If number is -∞𝔽, return -∞.
  if (!number.isFinite()) {
    traceEntry({ kind: 'return', hint: `Number is ${R(number) > 0 ? '+' : '-'}∞, return as-is.` });
    return R(number);
  }
  // 4. Let integer be floor(abs(ℝ(number))).
  let integer = Math.floor(Math.abs(R(number)));
  // 5. If number < +0𝔽, set integer to -integer.
  if (R(number) < 0 && integer !== 0) {
    integer = -integer;
  }
  // 6. Return integer.
  traceEntry({ kind: 'return', hint: `Convert to integer: ${integer}.` });
  return integer;
}

/** https://tc39.es/ecma262/#sec-toint32 */
export function* ToInt32(argument: Value): ValueEvaluator<NumberValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToInt32' });

  // 1. Let number be ? ToNumber(argument).
  traceEntry({ kind: 'operation', hint: 'Call ToNumber.' });
  const number = R(Q(yield* ToNumber(argument)));
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    traceEntry({ kind: 'return', hint: 'Number is NaN, ±0, or infinite, return +0.' });
    return F(+0);
  }
  // 3. Let int be truncate(ℝ(number)).
  const int = Math.trunc(number);
  traceEntry({ kind: 'operation', hint: `After truncation: ${int}` });
  // 4. Let int32bit be int modulo 2^32.
  const int32bit = mod(int, 2 ** 32);
  // 5. If int32bit ≥ 2^31, return 𝔽(int32bit - 2^32); otherwise return 𝔽(int32bit).
  if (int32bit >= (2 ** 31)) {
    const result = int32bit - (2 ** 32);
    traceEntry({ kind: 'return', hint: `Convert to signed int32: ${result}.` });
    return F(result);
  }
  traceEntry({ kind: 'return', hint: `Convert to int32: ${int32bit}.` });
  return F(int32bit);
}

/** https://tc39.es/ecma262/#sec-touint32 */
export function* ToUint32(argument: Value): ValueEvaluator<NumberValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToUint32' });

  // 1. Let number be ? ToNumber(argument).
  traceEntry({ kind: 'operation', hint: 'Call ToNumber.' });
  const number = R(Q(yield* ToNumber(argument)));
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    traceEntry({ kind: 'return', hint: 'Number is NaN, ±0, or infinite, return +0.' });
    return F(+0);
  }
  // 3. Let int be truncate(ℝ(number)).
  const int = Math.trunc(number);
  traceEntry({ kind: 'operation', hint: `After truncation: ${int}` });
  // 4. Let int32bit be int modulo 2^32.
  const int32bit = mod(int, 2 ** 32);
  // 5. Return 𝔽(int32bit).
  traceEntry({ kind: 'return', hint: `Convert to uint32: ${int32bit >>> 0}.` });
  return F(int32bit);
}

/** https://tc39.es/ecma262/#sec-toint16 */
export function* ToInt16(argument: Value): ValueEvaluator<NumberValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToInt16' });

  // 1. Let number be ? ToNumber(argument).
  traceEntry({ kind: 'operation', hint: 'Call ToNumber.' });
  const number = R(Q(yield* ToNumber(argument)));
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    traceEntry({ kind: 'return', hint: 'Number is NaN, ±0, or infinite, return +0.' });
    return F(+0);
  }
  // 3. Let int be truncate(ℝ(number)).
  const int = Math.trunc(number);
  traceEntry({ kind: 'operation', hint: `After truncation: ${int}` });
  // 4. Let int16bit be int modulo 2^16.
  const int16bit = mod(int, 2 ** 16);
  // 5. If int16bit ≥ 2^31, return 𝔽(int16bit - 2^32); otherwise return 𝔽(int16bit).
  if (int16bit >= (2 ** 15)) {
    const result = int16bit - (2 ** 16);
    traceEntry({ kind: 'return', hint: `Convert to signed int16: ${result}.` });
    return F(result);
  }
  traceEntry({ kind: 'return', hint: `Convert to int16: ${int16bit}.` });
  return F(int16bit);
}

/** https://tc39.es/ecma262/#sec-touint16 */
export function* ToUint16(argument: Value): ValueEvaluator<NumberValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToUint16' });

  // 1. Let number be ? ToNumber(argument).
  traceEntry({ kind: 'operation', hint: 'Call ToNumber.' });
  const number = R(Q(yield* ToNumber(argument)));
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    traceEntry({ kind: 'return', hint: 'Number is NaN, ±0, or infinite, return +0.' });
    return F(+0);
  }
  // 3. Let int be truncate(ℝ(number)).
  const int = Math.trunc(number);
  traceEntry({ kind: 'operation', hint: `After truncation: ${int}` });
  // 4. Let int16bit be int modulo 2^16.
  const int16bit = mod(int, 2 ** 16);
  // 5. Return 𝔽(int16bit).
  traceEntry({ kind: 'return', hint: `Convert to uint16: ${int16bit & 0xFFFF}.` });
  return F(int16bit);
}

/** https://tc39.es/ecma262/#sec-toint8 */
export function* ToInt8(argument: Value): ValueEvaluator<NumberValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToInt8' });

  // 1. Let number be ? ToNumber(argument).
  traceEntry({ kind: 'operation', hint: 'Call ToNumber.' });
  const number = R(Q(yield* ToNumber(argument)));
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    traceEntry({ kind: 'return', hint: 'Number is NaN, ±0, or infinite, return +0.' });
    return F(+0);
  }
  // 3. Let int be truncate(ℝ(number)).
  const int = Math.trunc(number);
  traceEntry({ kind: 'operation', hint: `After truncation: ${int}` });
  // 4. Let int8bit be int modulo 2^8.
  const int8bit = mod(int, 2 ** 8);
  // 5. If int8bit ≥ 2^7, return 𝔽(int8bit - 2^8); otherwise return 𝔽(int8bit).
  if (int8bit >= (2 ** 7)) {
    const result = int8bit - (2 ** 8);
    traceEntry({ kind: 'return', hint: `Convert to signed int8: ${result}.` });
    return F(result);
  }
  traceEntry({ kind: 'return', hint: `Convert to int8: ${int8bit}.` });
  return F(int8bit);
}

/** https://tc39.es/ecma262/#sec-touint8 */
export function* ToUint8(argument: Value): ValueEvaluator<NumberValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToUint8' });

  // 1. Let number be ? ToNumber(argument).
  traceEntry({ kind: 'operation', hint: 'Call ToNumber.' });
  const number = R(Q(yield* ToNumber(argument)));
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    traceEntry({ kind: 'return', hint: 'Number is NaN, ±0, or infinite, return +0.' });
    return F(+0);
  }
  // 3. Let int be truncate(ℝ(number)).
  const int = Math.trunc(number);
  traceEntry({ kind: 'operation', hint: `After truncation: ${int}` });
  // 4. Let int8bit be int modulo 2^8.
  const int8bit = mod(int, 2 ** 8);
  // 5. Return 𝔽(int8bit).
  traceEntry({ kind: 'return', hint: `Convert to uint8: ${int8bit & 0xFF}.` });
  return F(int8bit);
}

/** https://tc39.es/ecma262/#sec-touint8clamp */
export function* ToUint8Clamp(argument: Value): ValueEvaluator<NumberValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToUint8Clamp' });

  // 1. Let number be ? ToNumber(argument).
  traceEntry({ kind: 'operation', hint: 'Call ToNumber.' });
  const number = R(Q(yield* ToNumber(argument)));
  // 2. If number is NaN, return +0𝔽.
  if (Number.isNaN(number)) {
    traceEntry({ kind: 'return', hint: 'Number is NaN, return +0.' });
    return F(+0);
  }
  // 3. If ℝ(number) ≤ 0, return +0𝔽.
  if (number <= 0) {
    traceEntry({ kind: 'return', hint: 'Number ≤ 0, return +0.' });
    return F(+0);
  }
  // 4. If ℝ(number) ≥ 255, return 255𝔽.
  if (number >= 255) {
    traceEntry({ kind: 'return', hint: 'Number ≥ 255, return 255.' });
    return F(255);
  }
  // 5. Let f be floor(ℝ(number)).
  const f = Math.floor(number);
  traceEntry({ kind: 'operation', hint: `After floor: ${f}` });
  // 6. If f + 0.5 < ℝ(number), return 𝔽(f + 1).
  if (f + 0.5 < number) {
    traceEntry({ kind: 'return', hint: `Round up (nearest value > ${f}.5): ${f + 1}.` });
    return F(f + 1);
  }
  // 7. If ℝ(number) < f + 0.5, return 𝔽(f).
  if (number < f + 0.5) {
    traceEntry({ kind: 'return', hint: `Round down (nearest value < ${f}.5): ${f}.` });
    return F(f);
  }
  // 8. If f is odd, return 𝔽(f + 1).
  if (f % 2 === 1) {
    traceEntry({ kind: 'return', hint: `Round to even (tie, round up): ${f + 1}.` });
    return F(f + 1);
  }
  // 9. Return 𝔽(f).
  traceEntry({ kind: 'return', hint: `Round to even (tie, round down): ${f}.` });
  return F(f);
}

/** https://tc39.es/ecma262/#sec-tobigint */
export function* ToBigInt(argument: Value): ValueEvaluator<BigIntValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToBigInt' });

  // 1. Let prim be ? ToPrimitive(argument, number).
  traceEntry({ kind: 'operation', hint: 'Call ToPrimitive with hint "number".' });
  const prim = Q(yield* ToPrimitive(argument, 'number'));
  // 2. Return the value that prim corresponds to in Table 12 (#table-tobigint).
  if (prim instanceof UndefinedValue) {
    traceEntry({ kind: 'throw', hint: 'Cannot convert undefined to BigInt.' });
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertToBigInt', prim);
  } else if (prim instanceof NullValue) {
    traceEntry({ kind: 'throw', hint: 'Cannot convert null to BigInt.' });
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertToBigInt', prim);
  } else if (prim instanceof BooleanValue) {
    traceEntry({ kind: 'operation', hint: `Convert boolean ${prim === Value.true ? 'true' : 'false'} to BigInt.` });
    // Return 1ℤ if prim is true and 0ℤ if prim is false.
    if (prim === Value.true) {
      return Z(1n);
    }
    return Z(0n);
  } else if (prim instanceof BigIntValue) {
    traceEntry({ kind: 'return', hint: 'Result is already BigInt, return as-is.' });
    // Return prim.
    return prim;
  } else if (prim instanceof NumberValue) {
    traceEntry({ kind: 'throw', hint: 'Cannot convert number to BigInt.' });
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertToBigInt', prim);
  } else if (prim instanceof JSStringValue) {
    traceEntry({ kind: 'operation', hint: `Parse string "${prim.stringValue()}" as BigInt.` });
    // 1. Let n be StringToBigInt(prim).
    const n = StringToBigInt(prim);
    // 2. If n is NaN, throw a SyntaxError exception.
    if (n === undefined) {
      traceEntry({ kind: 'throw', hint: 'Invalid BigInt string syntax.' });
      return surroundingAgent.Throw('SyntaxError', 'CannotConvertToBigInt', prim);
    }
    // 3. Return n.
    traceEntry({ kind: 'return', hint: `String parsed as BigInt ${n.value}.` });
    return n;
  } else if (prim instanceof SymbolValue) {
    traceEntry({ kind: 'throw', hint: 'Cannot convert symbol to BigInt.' });
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'bigint');
  }
  throw new OutOfRange('ToBigInt', argument);
}

/** https://tc39.es/ecma262/#sec-stringtobigint */
export function StringToBigInt(argument: JSStringValue) {
  try {
    return Z(BigInt(argument.stringValue()));
  } catch {
    return undefined;
  }
}

/** https://tc39.es/ecma262/#sec-tobigint64 */
export function* ToBigInt64(argument: Value): ValueEvaluator<BigIntValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToBigInt64' });

  // 1. Let n be ? ToBigInt(argument).
  traceEntry({ kind: 'operation', hint: 'Call ToBigInt.' });
  const n = Q(yield* (ToBigInt(argument)));
  // 2. Let int64bit be ℝ(n) modulo 2^64.
  const int64bit = R(n) % (2n ** 64n);
  traceEntry({ kind: 'operation', hint: `After modulo 2^64: ${int64bit}` });
  // 3. If int64bit ≥ 2^63, return ℤ(int64bit - 2^64); otherwise return ℤ(int64bit).
  if (int64bit >= 2n ** 63n) {
    const result = int64bit - (2n ** 64n);
    traceEntry({ kind: 'return', hint: `Convert to signed int64: ${result}.` });
    return Z(result);
  }
  traceEntry({ kind: 'return', hint: `Convert to int64: ${int64bit}.` });
  return Z(int64bit);
}

/** https://tc39.es/ecma262/#sec-tobiguint64 */
export function* ToBigUint64(argument: Value): ValueEvaluator<BigIntValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToBigUint64' });

  // 1. Let n be ? ToBigInt(argument).
  traceEntry({ kind: 'operation', hint: 'Call ToBigInt.' });
  const n = Q(yield* (ToBigInt(argument)));
  // 2. Let int64bit be ℝ(n) modulo 2^64.
  const int64bit = R(n) % (2n ** 64n);
  traceEntry({ kind: 'operation', hint: `After modulo 2^64: ${int64bit}` });
  // 3. Return ℤ(int64bit).
  traceEntry({ kind: 'return', hint: `Convert to uint64: ${int64bit}.` });
  return Z(int64bit);
}

/** https://tc39.es/ecma262/#sec-tostring */
export function* ToString(argument: Value): ValueEvaluator<JSStringValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToString' });

  if (argument instanceof UndefinedValue) {
    traceEntry({ kind: 'return', hint: 'If argument is undefined, return "undefined".' });
    return Value('undefined');
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is undefined, return "undefined".' });
  }

  if (argument instanceof NullValue) {
    traceEntry({ kind: 'return', hint: 'If argument is null, return "null".' });
    return Value('null');
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is null, return "null".' });
  }

  if (argument instanceof BooleanValue) {
    const boolStr = argument === Value.true ? 'true' : 'false';
    traceEntry({ kind: 'return', hint: `If argument is ${boolStr}, return "${boolStr}".` });
    return Value(boolStr);
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is boolean, return "true" or "false".' });
  }

  if (argument instanceof NumberValue) {
    traceEntry({ kind: 'operation', hint: `Convert number ${R(argument)} to string.` });
    return X(NumberValue.toString(argument, 10));
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is number, convert using Number::toString.' });
  }

  if (argument instanceof JSStringValue) {
    traceEntry({ kind: 'return', hint: 'Argument is already a string, return as-is.' });
    return argument;
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is string, return as-is.' });
  }

  if (argument instanceof SymbolValue) {
    traceEntry({ kind: 'throw', hint: 'Cannot convert Symbol to String - throw TypeError.' });
    return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'string');
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is Symbol, throw TypeError.' });
  }

  if (argument instanceof BigIntValue) {
    traceEntry({ kind: 'operation', hint: `Convert BigInt ${R(argument)} to string.` });
    return X(BigIntValue.toString(argument, 10));
  } else {
    traceEntry({ kind: 'if', hint: 'If argument is BigInt, convert using BigInt::toString.' });
  }

  if (argument instanceof ObjectValue) {
    traceEntry({ kind: 'operation', hint: 'Convert object to primitive then recurse ToString.' });
    const primValue = Q(yield* ToPrimitive(argument, 'string'));
    return Q(yield* ToString(primValue));
  }

  throw new OutOfRange('ToString', { argument });
}

/** https://tc39.es/ecma262/#sec-toobject */
export function ToObject(argument: Value): ValueCompletion<ObjectValue> {
  argument.trace.addEntry({
    algoId: 'ToObject',
    kind: 'operation',
    value: argument.type,
    type: argument.type,
    hint: `Convert ${argument.type} to object.`,
  });

  if (argument === Value.undefined) {
    argument.trace.addEntry({
      algoId: 'ToObject',
      kind: 'throw',
      value: 'undefined',
      type: 'undefined',
      hint: 'Cannot convert undefined to object.',
    });
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertToObject', 'undefined');
  } else if (argument === Value.null) {
    argument.trace.addEntry({
      algoId: 'ToObject',
      kind: 'throw',
      value: 'null',
      type: 'null',
      hint: 'Cannot convert null to object.',
    });
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertToObject', 'null');
  } else if (argument instanceof BooleanValue) {
    argument.trace.addEntry({
      algoId: 'ToObject',
      kind: 'return',
      value: 'Boolean object',
      type: 'object',
      hint: `Wrap boolean ${argument === Value.true ? 'true' : 'false'} in Boolean object.`,
    });
    // Return a new Boolean object whose [[BooleanData]] internal slot is set to argument.
    const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Boolean.prototype%'), ['BooleanData']) as Mutable<BooleanObject>;
    obj.BooleanData = argument;
    return obj;
  } else if (argument instanceof NumberValue) {
    argument.trace.addEntry({
      algoId: 'ToObject',
      kind: 'return',
      value: 'Number object',
      type: 'object',
      hint: `Wrap number ${R(argument)} in Number object.`,
    });
    // Return a new Number object whose [[NumberData]] internal slot is set to argument.
    const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Number.prototype%'), ['NumberData']) as Mutable<NumberObject>;
    obj.NumberData = argument;
    return obj;
  } else if (argument instanceof JSStringValue) {
    argument.trace.addEntry({
      algoId: 'ToObject',
      kind: 'return',
      value: 'String object',
      type: 'object',
      hint: `Wrap string "${argument.stringValue()}" in String object.`,
    });
    // Return a new String object whose [[StringData]] internal slot is set to argument.
    return StringCreate(argument, surroundingAgent.intrinsic('%String.prototype%'));
  } else if (argument instanceof SymbolValue) {
    argument.trace.addEntry({
      algoId: 'ToObject',
      kind: 'return',
      value: 'Symbol object',
      type: 'object',
      hint: 'Wrap symbol in Symbol object.',
    });
    // Return a new Symbol object whose [[SymbolData]] internal slot is set to argument.
    const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Symbol.prototype%'), ['SymbolData']) as Mutable<SymbolObject>;
    obj.SymbolData = argument;
    return obj;
  } else if (argument instanceof BigIntValue) {
    argument.trace.addEntry({
      algoId: 'ToObject',
      kind: 'return',
      value: 'BigInt object',
      type: 'object',
      hint: `Wrap BigInt ${R(argument)} in BigInt object.`,
    });
    // Return a new BigInt object whose [[BigIntData]] internal slot is set to argument.
    const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%BigInt.prototype%'), ['BigIntData']) as Mutable<BigIntObject>;
    obj.BigIntData = argument;
    return obj;
  }
  Assert(argument instanceof ObjectValue);
  argument.trace.addEntry({
    algoId: 'ToObject',
    kind: 'return',
    value: 'object',
    type: 'object',
    hint: 'Argument is already an object, return as-is.',
  });
  return argument;
}

/** https://tc39.es/ecma262/#sec-topropertykey */
export function* ToPropertyKey(argument: Value): ValueEvaluator<PropertyKeyValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToPropertyKey' });

  // 1. Let key be ? ToPrimitive(argument, string).
  traceEntry({ kind: 'operation', hint: 'Call ToPrimitive with hint "string".' });
  const key = Q(yield* ToPrimitive(argument, 'string'));
  // 2. If Type(key) is Symbol, then
  if (key instanceof SymbolValue) {
    // a. Return key.
    traceEntry({ kind: 'return', hint: 'Result is Symbol, return as property key.' });
    return key;
  }
  // 3. Return ! ToString(key).
  traceEntry({ kind: 'operation', hint: 'Convert to string for property key.' });
  return X(ToString(key));
}

/** https://tc39.es/ecma262/#sec-tolength */
export function* ToLength(argument: Value): ValueEvaluator<NumberValue> {
  const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToLength' });

  // 1. Let len be ? ToIntegerOrInfinity(argument).
  traceEntry({ kind: 'operation', hint: 'Call ToIntegerOrInfinity.' });
  const len = Q(yield* ToIntegerOrInfinity(argument));
  // 2. If len ≤ 0, return +0𝔽.
  if (len <= 0) {
    traceEntry({ kind: 'return', hint: 'Integer is ≤ 0, return +0.' });
    return F(+0);
  }
  // 3. Return 𝔽(min(len, 253 - 1)).
  const maxLength = (2 ** 53) - 1;
  const result = Math.min(len, maxLength);
  traceEntry({ kind: 'return', hint: `Clamp to valid length: ${result}.` });
  return F(result);
}

/** https://tc39.es/ecma262/#sec-canonicalnumericindexstring */
export function CanonicalNumericIndexString(argument: Value) {
  // 1. Assert: Type(argument) is String.
  Assert(argument instanceof JSStringValue);
  argument.trace.addEntry({
    algoId: 'CanonicalNumericIndexString',
    kind: 'operation',
    value: argument.stringValue(),
    type: 'string',
    hint: `Check if "${argument.stringValue()}" is a canonical numeric index.`,
  });

  // 2. If argument is "-0", return -0𝔽.
  if (argument.stringValue() === '-0') {
    argument.trace.addEntry({
      algoId: 'CanonicalNumericIndexString',
      kind: 'return',
      value: '-0',
      type: 'number',
      hint: 'String is "-0", return -0.',
    });
    return F(-0);
  }
  // 3. Let n be ! ToNumber(argument).
  const n = X(ToNumber(argument));
  // 4. If SameValue(! ToString(n), argument) is false, return undefined.
  const strRep = X(ToString(n));
  if (SameValue(strRep, argument) === Value.false) {
    argument.trace.addEntry({
      algoId: 'CanonicalNumericIndexString',
      kind: 'return',
      value: 'undefined',
      type: 'undefined',
      hint: 'Number-to-string round-trip failed, not a canonical index.',
    });
    return Value.undefined;
  }
  // 4. Return n.
  argument.trace.addEntry({
    algoId: 'CanonicalNumericIndexString',
    kind: 'return',
    value: String(R(n)),
    type: 'number',
    hint: `Valid canonical numeric index: ${R(n)}.`,
  });
  return n;
}

/** https://tc39.es/ecma262/#sec-toindex */
export function* ToIndex(value: Value) {
  const traceEntry = createTraceEntryFromValue({ argument: value, algoId: 'ToIndex' });

  // 1. If value is undefined, then
  if (value instanceof UndefinedValue) {
    // a. Return 0.
    traceEntry({ kind: 'return', hint: 'Value is undefined, return 0 as index.' });
    return 0;
  } else {
    // a. Let integerIndex be 𝔽(? ToIntegerOrInfinity(value)).
    traceEntry({ kind: 'operation', hint: 'Call ToIntegerOrInfinity.' });
    const integerIndex = F(Q(yield* ToIntegerOrInfinity(value)));
    // b. If integerIndex < +0𝔽, throw a RangeError exception.
    if (R(integerIndex) < 0) {
      traceEntry({ kind: 'throw', hint: 'Index is negative.' });
      return surroundingAgent.Throw('RangeError', 'NegativeIndex', 'Index');
    }
    // c. Let index be ! ToLength(integerIndex).
    traceEntry({ kind: 'operation', hint: 'Clamp index to valid length.' });
    const index = X(ToLength(integerIndex));
    // d. If ! SameValue(integerIndex, index) is false, throw a RangeError exception.
    if (X(SameValue(integerIndex, index)) === Value.false) {
      traceEntry({ kind: 'throw', hint: 'Index exceeds maximum length.' });
      return surroundingAgent.Throw('RangeError', 'OutOfRange', 'Index');
    }
    // e. Return ℝ(index).
    traceEntry({ kind: 'return', hint: `Valid index: ${R(index)}.` });
    return R(index);
  }
}
