import { z } from "zod";
import { executeRequestSchema } from "./schema.ts";
import type { SerializedTraceNode, SerializedValue } from "./execute/serialize.ts";

export type ExecuteRequest = z.infer<typeof executeRequestSchema>;

export type ExecuteResponse = {
  success: boolean;
  functionName: string;
  /** Serialized return value of the algorithm (when success). */
  result?: SerializedValue;
  /** Root algorithm invocation tree (when success). Sub-algos nest inside call-kind steps. */
  root?: SerializedTraceNode;
  error?: string;
};
