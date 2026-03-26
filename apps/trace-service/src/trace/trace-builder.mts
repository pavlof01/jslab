/**
 * Hierarchical tracing for ECMAScript algorithms
 * Provides clean separation between operations (nodes) and steps (within operations)
 */

import type { Value } from './value.mts';
import type { TraceStepKind } from './trace.mts';

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
}): (step: TraceEntryInput) => void {
  const record = argument.trace;
  record.pushOperation(algoId, inputs);
  
  // Return step logger with auto-close behavior
  return (step: TraceEntryInput) => {
    // Add the step
    record.addStep({
      kind: step.kind,
      hint: step.hint,
      description: step.description,
      value: step.value,
      type: step.type,
      inputs: step.inputs,
      output: step.output,
      error: step.error,
    });

    // Auto-close on return
    if (step.kind === 'return') {
      record.popOperation(step.output);
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
