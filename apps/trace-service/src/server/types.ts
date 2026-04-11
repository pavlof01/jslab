import { z } from "zod";
import type { FlatStep } from "./execute/flat-trace-builder.ts";
import { executeRequestSchema } from "./schema.ts";

export type ExecuteRequest = z.infer<typeof executeRequestSchema>;

export type ExecuteResponse = {
  success: boolean;
  functionName: string;
  resultValue: string;
  resultType: string;
  steps: FlatStep[];
  stepCount: number;
  error?: string;
};
