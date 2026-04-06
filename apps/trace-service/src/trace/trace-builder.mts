/**
 * Hierarchical tracing for ECMAScript algorithms
 * Provides clean separation between operations (nodes) and steps (within operations)
 */

import {
  Value,
  NumberValue, JSStringValue, BooleanValue, NullValue,
  UndefinedValue, SymbolValue, BigIntValue, ObjectValue,
} from './value.mts';
import type { TraceStepKind } from './trace.mts';
import { R } from './abstract-ops/spec-types.mts';

/** Serialize a Value to a human-readable display string for the UI. */
function valueToDisplayString(v: Value): string {
  if (v instanceof UndefinedValue) return 'undefined';
  if (v instanceof NullValue) return 'null';
  if (v instanceof BooleanValue) return v === Value.true ? 'true' : 'false';
  if (v instanceof NumberValue) {
    const n = R(v);
    if (Number.isNaN(n)) return 'NaN';
    if (!isFinite(n)) return n > 0 ? '+∞' : '-∞';
    return String(n);
  }
  if (v instanceof JSStringValue) return `"${v.stringValue()}"`;
  if (v instanceof SymbolValue) return 'Symbol()';
  if (v instanceof BigIntValue) return `${R(v)}n`;
  // Object — serialize own string-keyed properties with values
  if (v instanceof ObjectValue) {
    const parts: string[] = [];
    for (const [key, desc] of v.properties.entries()) {
      if (!(key instanceof JSStringValue)) continue;
      const propName = key.stringValue();
      let propVal = '…';
      if (desc.Value !== undefined) {
        const dv = desc.Value;
        if (dv instanceof UndefinedValue) propVal = 'undefined';
        else if (dv instanceof NullValue) propVal = 'null';
        else if (dv instanceof BooleanValue) propVal = dv === Value.true ? 'true' : 'false';
        else if (dv instanceof NumberValue) propVal = String(R(dv));
        else if (dv instanceof JSStringValue) propVal = `"${dv.stringValue()}"`;
        else if (dv instanceof BigIntValue) propVal = `${R(dv)}n`;
        else if ('SourceText' in dv && typeof (dv as { SourceText: unknown }).SourceText === 'string') {
          // Function — show source text trimmed to 40 chars
          const src = ((dv as { SourceText: string }).SourceText).trim();
          propVal = src.length > 40 ? src.slice(0, 40) + '…' : src;
        } else {
          propVal = '{…}';
        }
      } else if (desc.Get !== undefined) {
        propVal = 'get …';
      }
      parts.push(`${propName}: ${propVal}`);
      if (parts.length >= 3) { parts.push('…'); break; }
    }
    return parts.length === 0 ? '{}' : `{ ${parts.join(', ')} }`;
  }
  return '{…}';
}

/**
 * TraceStep with auto-close behavior
 * Automatically pops the operation when kind is 'return' or 'throw'
 */
export interface TraceEntryInput {
  kind: TraceStepKind;
  hint?: string;
  description?: string;
  value?: string;
  type?: string;
  inputs?: string[];
  output?: string;
  error?: string;
  /** ECMA spec step order (1-based). UI sorts by this so diagram matches spec. */
  specOrder?: number;

  /** For if-kind steps: true = condition was met (taken), false = not taken (skipped). */
  taken?: boolean;
}

/**
 * Creates a trace entry logger for an algorithm
 *
 * @param argument - The Value being processed (provides access to trace record)
 * @param algoId - Algorithm identifier (e.g., 'ToNumber', 'ToPrimitive')
 * @param inputs - Optional input descriptions
 * @returns A function that logs steps and auto-closes on return/throw
 *
 * Example:
 *   const traceEntry = createTraceEntryFromValue({ argument, algoId: 'ToNumber' });
 *   traceEntry({ kind: 'if', hint: 'Check if input is null' });
 *   traceEntry({ kind: 'return', output: '0' });  // Auto-closes operation
 */
export function createTraceEntryFromValue({
  argument,
  algoId,
  inputs,
}: {
  argument: Value;
  algoId: string;
  inputs?: string[];
}): (step: TraceEntryInput, returnValue?: Value) => void {
  const record = argument.trace;
  record.pushOperation(algoId, inputs ?? [valueToDisplayString(argument)]);
  
  // Return step logger with auto-close behavior.
  // Optional second arg `returnValue` is the actual ECMAScript Value being returned;
  // when provided its display string is stored as both `value` and `output` on the step
  // and on the operation node (via popOperation), so the frontend can show the return value.
  return (step: TraceEntryInput, returnValue?: Value) => {
    const computedOutput = returnValue !== undefined ? valueToDisplayString(returnValue) : step.output;
    // Add the step
    record.addStep({
      kind: step.kind,
      hint: step.hint,
      description: step.description,
      value: computedOutput ?? step.value,
      type: step.type,
      inputs: step.inputs,
      output: computedOutput,
      error: step.error,
      specOrder: step.specOrder,
      taken: step.taken,
    });

    // Auto-close on return
    if (step.kind === 'return') {
      record.popOperation(computedOutput);
    }
    // Auto-close on throw
    else if (step.kind === 'throw') {
      if (step.error) {
        record.setError(step.error);
      }
      record.popOperation();
    }
  };
}
