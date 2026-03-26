import type { SpecValue } from "@/app/abstract-functions-visualizer/spec-runner";

export function parseUserInput(input: string): SpecValue {
  const trimmed = input.trim();

  // Empty string
  if (trimmed === "") {
    return { type: "String", value: "" };
  }

  // String literal: "something" or 'something'
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const stringValue = trimmed.slice(1, -1);
    return { type: "String", value: stringValue };
  }

  // Array: [...]
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const arrayValue = JSON.parse(trimmed);
      if (Array.isArray(arrayValue)) {
        return { type: "Array", value: arrayValue };
      }
    } catch {
      // Fall through to try as object or string
    }
  }

  // Object: {...}
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      // Try standard JSON parse first
      const objectValue = JSON.parse(trimmed);
      if (objectValue !== null && typeof objectValue === "object" && !Array.isArray(objectValue)) {
        return { type: "Object", value: objectValue };
      }
    } catch {
      // Try to parse as object with methods using Function constructor
      try {
        // Only allow safe code patterns (no await, no import, etc.)
        if (trimmed.includes("import") || trimmed.includes("fetch") || trimmed.includes("eval")) {
          throw new Error("Unsafe code pattern");
        }
        const objectValue = (new Function("return (" + trimmed + ")"))();
        if (objectValue !== null && typeof objectValue === "object") {
          return { type: "Object", value: objectValue };
        }
      } catch {
        // Fall through to plain string if parsing fails
      }
    }
  }

  // Number: integer, float, Infinity, -Infinity, NaN
  if (trimmed === "Infinity" || trimmed === "-Infinity" || trimmed === "NaN") {
    const numValue = Number(trimmed);
    return { type: "Number", value: numValue };
  }

  // Try parsing as number
  if (!isNaN(Number(trimmed)) && trimmed !== "") {
    const numValue = Number(trimmed);
    return { type: "Number", value: numValue };
  }

  // Default: treat as string
  return { type: "String", value: trimmed };
}
