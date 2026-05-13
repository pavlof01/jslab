import { z } from "zod";

// Request/Response types
export const executeRequestSchema = z.object({
  functionName: z.string().min(1),
  input: z.string(),
  preferredType: z.enum(["string", "number"]).optional(),
});
