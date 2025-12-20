export type TraceNode = {
  id: string;
  rule?: string;
  description: string;
  x: unknown;
  y: unknown;
  children?: TraceNode[];
  result?: boolean;
  depth: number;
  note?: string;
  threw?: boolean;
  error?: string;
};

export type TraceJsType = "Undefined" | "Null" | "Boolean" | "Number" | "String" | "Symbol" | "BigInt" | "Object";

export const TRACE_TYPE_COLORS: Record<TraceJsType, string> = {
  Number: "#4FC1FF",
  String: "#C98A7D",
  Boolean: "#E5C07B",
  BigInt: "#D19A66",
  Symbol: "#56B6C2",
  Object: "#98C379",
  Undefined: "#ABB2BF",
  Null: "#A3BE8C",
};

type Primitive = null | undefined | boolean | number | string | symbol | bigint;

type TraceContext = {
  seq: number;
};

const primitiveForObjectConversion: TraceJsType[] = ["String", "Number", "BigInt", "Symbol"];

function nextId(ctx: TraceContext): string {
  ctx.seq += 1;
  return `n${ctx.seq}`;
}

function isPrimitive(value: unknown): value is Primitive {
  const t = typeof value;
  return (
    value === null ||
    t === "undefined" ||
    t === "boolean" ||
    t === "number" ||
    t === "string" ||
    t === "symbol" ||
    t === "bigint"
  );
}

function getJsType(value: unknown): TraceJsType {
  if (value === null) return "Null";
  const t = typeof value;
  switch (t) {
    case "undefined":
      return "Undefined";
    case "boolean":
      return "Boolean";
    case "number":
      return "Number";
    case "string":
      return "String";
    case "symbol":
      return "Symbol";
    case "bigint":
      return "BigInt";
    default:
      return "Object";
  }
}

export const traceTypeOf = (value: unknown): TraceJsType => getJsType(value);

function formatValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function") return "[Function]";
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  }
  return String(value);
}

function stringifyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function makeNode(ctx: TraceContext, data: Omit<TraceNode, "id"> & { id?: string }, depth: number): TraceNode {
  return {
    id: data.id ?? nextId(ctx),
    ...data,
    depth,
  };
}

function toPrimitiveDefault(input: unknown): { value?: Primitive; via?: string; error?: string } {
  if (isPrimitive(input)) {
    return { value: input, via: "already primitive" };
  }

  if (input && typeof input === "object") {
    const obj = input as Record<PropertyKey, unknown>;
    try {
      const exotic = obj[Symbol.toPrimitive];
      if (typeof exotic === "function") {
        const res = exotic.call(obj, "default");
        if (isPrimitive(res)) {
          return { value: res, via: "Symbol.toPrimitive" };
        }
      }
    } catch (err) {
      return { error: stringifyError(err) };
    }

    try {
      const valueOf = (obj as { valueOf?: () => unknown }).valueOf;
      if (typeof valueOf === "function") {
        const res = valueOf.call(obj);
        if (isPrimitive(res)) return { value: res, via: "valueOf" };
      }
    } catch (err) {
      return { error: stringifyError(err) };
    }

    try {
      const toString = (obj as { toString?: () => unknown }).toString;
      if (typeof toString === "function") {
        const res = toString.call(obj);
        if (isPrimitive(res)) return { value: res as Primitive, via: "toString" };
      }
    } catch (err) {
      return { error: stringifyError(err) };
    }
  }

  return { error: "Cannot convert object to primitive value" };
}

function stringToBigInt(value: string): { value?: bigint; error?: string } {
  try {
    return { value: BigInt(value) };
  } catch (err) {
    return { error: stringifyError(err) };
  }
}

function isIntegralNumber(value: number): boolean {
  return Number.isFinite(value) && Math.trunc(value) === value;
}

function buildTrace(
  ctx: TraceContext,
  x: unknown,
  y: unknown,
  depth: number,
  opts?: { rule?: string; description?: string }
): TraceNode {
  const typeX = getJsType(x);
  const typeY = getJsType(y);
  const rulePrefix = opts?.rule;

  // Step 1: If Type(x) is the same as Type(y), return the result of IsStrictlyEqual(x, y).
  if (typeX === typeY) {
    return makeNode(
      ctx,
      {
        rule: rulePrefix ?? "Step 1",
        description: opts?.description ?? `Same Type (${typeX}) → IsStrictlyEqual`,
        x,
        y,
        result: (x as unknown) === (y as unknown),
      },
      depth
    );
  }

  // Step 2: If x is null and y is undefined, return true.
  if (typeX === "Null" && typeY === "Undefined") {
    return makeNode(
      ctx,
      { rule: rulePrefix ?? "Step 2", description: opts?.description ?? "null == undefined", x, y, result: true },
      depth
    );
  }

  // Step 3: If x is undefined and y is null, return true.
  if (typeX === "Undefined" && typeY === "Null") {
    return makeNode(
      ctx,
      { rule: rulePrefix ?? "Step 3", description: opts?.description ?? "undefined == null", x, y, result: true },
      depth
    );
  }

  // Step 4: If Type(x) is Number and Type(y) is String, return the result of x == ToNumber(y).
  if (typeX === "Number" && typeY === "String") {
    const converted = Number(y as string);
    const child = buildTrace(ctx, x, converted, depth + 1);
    return makeNode(
      ctx,
      {
        rule: rulePrefix ?? "Step 4",
        description: opts?.description ?? `y is String → ToNumber(y) = ${formatValue(converted)}`,
        x,
        y,
        children: [child],
      },
      depth
    );
  }

  // Step 5: If Type(x) is String and Type(y) is Number, return the result of ToNumber(x) == y.
  if (typeX === "String" && typeY === "Number") {
    const converted = Number(x as string);
    const child = buildTrace(ctx, converted, y, depth + 1);
    return makeNode(
      ctx,
      {
        rule: rulePrefix ?? "Step 5",
        description: opts?.description ?? `x is String → ToNumber(x) = ${formatValue(converted)}`,
        x,
        y,
        children: [child],
      },
      depth
    );
  }

  // Step 6: If Type(x) is BigInt and Type(y) is String, return the result of x == StringToBigInt(y).
  if (typeX === "BigInt" && typeY === "String") {
    const converted = stringToBigInt(y as string);
    if (converted.error) {
      return makeNode(
        ctx,
        {
          rule: rulePrefix ?? "Step 6",
          description: opts?.description ?? "StringToBigInt(y) failed",
          x,
          y,
          threw: true,
          error: converted.error,
        },
        depth
      );
    }
    const child = buildTrace(ctx, x, converted.value as bigint, depth + 1);
    return makeNode(
      ctx,
      {
        rule: rulePrefix ?? "Step 6",
        description: opts?.description ?? `y is String → StringToBigInt(y) = ${formatValue(converted.value)}`,
        x,
        y,
        children: [child],
      },
      depth
    );
  }

  // Step 7: If Type(x) is String and Type(y) is BigInt, return the result of StringToBigInt(x) == y.
  if (typeX === "String" && typeY === "BigInt") {
    const converted = stringToBigInt(x as string);
    if (converted.error) {
      return makeNode(
        ctx,
        {
          rule: rulePrefix ?? "Step 7",
          description: opts?.description ?? "StringToBigInt(x) failed",
          x,
          y,
          threw: true,
          error: converted.error,
        },
        depth
      );
    }
    const child = buildTrace(ctx, converted.value as bigint, y, depth + 1);
    return makeNode(
      ctx,
      {
        rule: rulePrefix ?? "Step 7",
        description: opts?.description ?? `x is String → StringToBigInt(x) = ${formatValue(converted.value)}`,
        x,
        y,
        children: [child],
      },
      depth
    );
  }

  // Step 8: If Type(x) is Boolean, return the result of ToNumber(x) == y.
  if (typeX === "Boolean") {
    const converted = Number(x);
    const child = buildTrace(ctx, converted, y, depth + 1);
    return makeNode(
      ctx,
      {
        rule: rulePrefix ?? "Step 8",
        description: opts?.description ?? `x is Boolean → ToNumber(x) = ${formatValue(converted)}`,
        x,
        y,
        children: [child],
      },
      depth
    );
  }

  // Step 9: If Type(y) is Boolean, return the result of x == ToNumber(y).
  if (typeY === "Boolean") {
    const converted = Number(y);
    const child = buildTrace(ctx, x, converted, depth + 1);
    return makeNode(
      ctx,
      {
        rule: rulePrefix ?? "Step 9",
        description: opts?.description ?? `y is Boolean → ToNumber(y) = ${formatValue(converted)}`,
        x,
        y,
        children: [child],
      },
      depth
    );
  }

  // Step 10: If Type(x) is String, Number, BigInt, or Symbol and Type(y) is Object, return the result of x == ToPrimitive(y).
  if (primitiveForObjectConversion.includes(typeX) && typeY === "Object") {
    const conversion = toPrimitiveDefault(y);
    if (conversion.error) {
      return makeNode(
        ctx,
        {
          rule: rulePrefix ?? "Step 10",
          description: opts?.description ?? "ToPrimitive(y) failed",
          x,
          y,
          threw: true,
          error: conversion.error,
        },
        depth
      );
    }
    const child = buildTrace(ctx, x, conversion.value as Primitive, depth + 1);
    return makeNode(
      ctx,
      {
        rule: rulePrefix ?? "Step 10",
        description:
          opts?.description ??
          `y is Object → ToPrimitive(y${conversion.via ? ` via ${conversion.via}` : ""}) = ${formatValue(
            conversion.value
          )}`,
        x,
        y,
        children: [child],
      },
      depth
    );
  }

  // Step 11: If Type(x) is Object and Type(y) is String, Number, BigInt, or Symbol, return the result of ToPrimitive(x) == y.
  if (typeX === "Object" && primitiveForObjectConversion.includes(typeY)) {
    const conversion = toPrimitiveDefault(x);
    if (conversion.error) {
      return makeNode(
        ctx,
        {
          rule: rulePrefix ?? "Step 11",
          description: opts?.description ?? "ToPrimitive(x) failed",
          x,
          y,
          threw: true,
          error: conversion.error,
        },
        depth
      );
    }
    const child = buildTrace(ctx, conversion.value as Primitive, y, depth + 1);
    return makeNode(
      ctx,
      {
        rule: rulePrefix ?? "Step 11",
        description:
          opts?.description ??
          `x is Object → ToPrimitive(x${conversion.via ? ` via ${conversion.via}` : ""}) = ${formatValue(
            conversion.value
          )}`,
        x,
        y,
        children: [child],
      },
      depth
    );
  }

  // Step 12: If Type(x) is BigInt and Type(y) is Number, return false if y is not integral. Otherwise, compare BigInt(y) to x.
  if (typeX === "BigInt" && typeY === "Number") {
    if (!isIntegralNumber(y as number)) {
      return makeNode(
        ctx,
        {
          rule: rulePrefix ?? "Step 12",
          description: opts?.description ?? "y is a non-integral Number → false",
          x,
          y,
          result: false,
        },
        depth
      );
    }
    const normalized = BigInt(y as number);
    return makeNode(
      ctx,
      {
        rule: rulePrefix ?? "Step 12",
        description: opts?.description ?? `Compare BigInt(y) = ${formatValue(normalized)} with x`,
        x,
        y,
        result: (x as bigint) === normalized,
      },
      depth
    );
  }

  // Step 13: If Type(x) is Number and Type(y) is BigInt, return false if x is not integral. Otherwise, compare x to Number(y).
  if (typeX === "Number" && typeY === "BigInt") {
    if (!isIntegralNumber(x as number)) {
      return makeNode(
        ctx,
        {
          rule: rulePrefix ?? "Step 13",
          description: opts?.description ?? "x is a non-integral Number → false",
          x,
          y,
          result: false,
        },
        depth
      );
    }
    const normalized = BigInt(x as number);
    return makeNode(
      ctx,
      {
        rule: rulePrefix ?? "Step 13",
        description: opts?.description ?? `Compare BigInt(x) = ${formatValue(normalized)} with y`,
        x,
        y,
        result: normalized === (y as bigint),
      },
      depth
    );
  }

  // Step 14: Otherwise, return false.
  return makeNode(
    ctx,
    {
      rule: rulePrefix ?? "Step 14",
      description: opts?.description ?? "Types are not comparable → false",
      x,
      y,
      result: false,
    },
    depth
  );
}

export function traceIsLooselyEqual(x: unknown, y: unknown): TraceNode {
  const ctx: TraceContext = { seq: 0 };
  const child = buildTrace(ctx, x, y, 1);
  return makeNode(
    ctx,
    {
      id: "entry",
      rule: "Entry",
      description: `IsLooselyEqual(${formatValue(x)}, ${formatValue(y)})`,
      x,
      y,
      children: [child],
    },
    0
  );
}

export function sampleLooseEqualityTrace(): TraceNode {
  return traceIsLooselyEqual("5", 5);
}

export type EqualityComparisonSummary = {
  looseTrace: TraceNode;
  looseResult: boolean | undefined;
  strictEqual: boolean;
  objectIs: boolean;
};

const extractResult = (node: TraceNode): boolean | undefined => {
  if (node.result !== undefined) return node.result;
  for (const child of node.children ?? []) {
    const found = extractResult(child);
    if (found !== undefined) return found;
  }
  return undefined;
};

/**
 * Convenience helper to generate the loose trace along with === and Object.is results
 * so UI can show quick comparison badges.
 */
export function traceEqualityComparisons(x: unknown, y: unknown): EqualityComparisonSummary {
  const looseTrace = traceIsLooselyEqual(x, y);
  return {
    looseTrace,
    looseResult: extractResult(looseTrace),
    strictEqual: x === y,
    objectIs: Object.is(x, y),
  };
}

export function exportTraceJson(trace: TraceNode): string {
  return JSON.stringify(trace, null, 2);
}
