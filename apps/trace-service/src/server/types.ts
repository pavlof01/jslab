import { z } from "zod";
import type { TraceNode } from "../trace/trace.mts";
import { executeRequestSchema } from "./schema.ts";

export type ExecuteRequest = z.infer<typeof executeRequestSchema>;

export type ExecuteResponse = {
  success: boolean;
  functionName: string;
  resultValue: string;
  resultType: string;
  trace: TraceNode[];
  stepCount: number;
  error?: string;
};
