import type { z } from "zod";

import type { SerializedTraceNode, SerializedValue } from "./execute/serialize.ts";
import type { executeRequestSchema } from "./schema.ts";

export type ExecuteRequest = z.infer<typeof executeRequestSchema>;

export type ExecuteResponse = {
  success: boolean;
  functionName: string;
  /** Serialized return value of the algorithm (when success). */
  result?: SerializedValue;
  /** Root algorithm invocation tree (when success). Sub-algos nest inside call-kind steps. */
  root?: SerializedTraceNode;
  /** For BinaryExpression: which spec algorithm was actually executed (e.g. "IsLooselyEqual"). */
  effectiveAlgoId?: string;
  /** For BinaryExpression: the operator parsed out of the input ("==", "!==", "<=", etc.). */
  detectedOperator?: string;
  error?: string;
  /** Machine-readable failure reason, e.g. "execution_budget_exceeded". */
  code?: string;
};
