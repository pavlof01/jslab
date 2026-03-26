import { z } from "zod";

// Request/Response types
export const executeRequestSchema = z.object({
  functionName: z.string().min(1),
  input: z.union([
    z.number(),
    z.boolean(),
    z.null(),
    z.undefined(),
    z.string(),
    z.array(z.any()),
    z.record(z.any())
  ]),
  preferredType: z.enum(["string", "number"]).optional()
});