import type { SpecValue } from "@/app/coercion-visualizer/spec-runner";

export function formatSpecValueForDisplay(value: SpecValue): string {
  if (value.type === "String") {
    // Show string with quotes for clarity
    return `"${value.value}"`;
  }

  if (value.type === "Number") {
    const num = value.value;
    if (num === "NaN") return "NaN";
    if (!isFinite(num as number)) {
      return String(num);
    }
    return String(num);
  }

  if (value.type === "Array") {
    return JSON.stringify(value.value);
  }

  if (value.type === "Object") {
    return JSON.stringify(value.value);
  }

  if (value.type === "Boolean") {
    return String(value.value);
  }

  if (value.type === "Undefined") {
    return "undefined";
  }

  if (value.type === "Null") {
    return "null";
  }

  // Default: try JSON.stringify
  return JSON.stringify(value.value);
}
