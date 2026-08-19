import { z } from "zod";

// Request/Response types
export const executeRequestSchema = z.object({
  functionName: z.string().min(1),
  input: z.string(),
  preferredType: z.enum(["string", "number"]).optional(),
});

/**
 * Fastify body schemas. `maxLength` on `input` is what enforces MAX_SOURCE_LENGTH:
 * an oversized payload is rejected during validation, before anything reaches engine262.
 */
export function buildTypeConversionBodySchema(
  availableFunctions: readonly string[],
  maxSourceLength: number,
) {
  return {
    type: "object",
    properties: {
      functionName: { type: "string", enum: [...availableFunctions] },
      input: { type: "string", maxLength: maxSourceLength },
      preferredType: { type: "string", enum: ["string", "number"] },
    },
    required: ["functionName", "input"],
  };
}

export function buildEqualityBodySchema(maxSourceLength: number) {
  return {
    type: "object",
    properties: {
      input: { type: "string", minLength: 1, maxLength: maxSourceLength },
    },
    required: ["input"],
  };
}
