import type { SpecValue } from "@/app/abstract-functions-visualizer/spec-runner";

export type NodePath = (number | string)[];

export type TraceFrame = {
  algoId: string;
  specUrl?: string;
};

export function formatNodePath(nodePath?: NodePath): string {
  if (!nodePath?.length) return "";
  return nodePath
    .map((seg) => {
      if (typeof seg === "number") return `${seg + 1}`;
      if (seg === "then") return "then";
      if (seg === "else") return "else";
      return String(seg);
    })
    .join(" › ");
}

export function formatSpecValue(value: SpecValue, maxLen = 42): string {
  const raw = (() => {
    switch (value.type) {
      case "Undefined":
        return "undefined";
      case "Null":
        return "null";
      case "Boolean":
        return String(value.value);
      case "Number":
        if (value.value === "NaN") return "NaN";
        if (Object.is(value.value, -0)) return "-0";
        return String(value.value);
      case "String":
        return `"${value.value}"`;
      case "BigInt":
        return `${value.value}n`;
      case "Symbol": {
        const hasDesc = value.value.description !== undefined;
        const base = hasDesc ? `Symbol(${JSON.stringify(value.value.description)})` : "Symbol()";
        return `${base}@${value.value.id}`;
      }
      case "Object":
        if (value.value.preview) {
          return value.value.class
            ? `${value.value.class}(${value.value.preview})`
            : value.value.preview;
        }
        return `${value.value.class}#${value.value.id}`;
      case "Array":
        return JSON.stringify(value.value);
      case "TypeTag":
        return `TypeTag(${value.value})`;
      default: {
        const _exhaustive: never = value;
        return String(_exhaustive);
      }
    }
  })();

  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, Math.max(0, maxLen - 1))}…`;
}
