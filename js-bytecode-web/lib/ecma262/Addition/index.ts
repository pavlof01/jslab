import { ToNumeric } from "../Number/ToNumeric";
import { ToPrimitive } from "../Object/ToPrimitive";
import { SameType } from "../SameType";
import { ToString } from "../String/ToString";
import { GetValue } from "../GetValue";

export type Operator = "**" | "*" | "/" | "%" | "+" | "-" | "<<" | ">>" | ">>>" | "&" | "^" | "|";
export const OPERATORS: Operator[] = ["**", "*", "/", "%", "+", "-", "<<", ">>", ">>>", "&", "^", "|"];

/* BigInt operations – matching the spec names */
const BigIntOps = {
  exponentiate: (a: bigint, b: bigint) => a ** b,
  divide: (a: bigint, b: bigint) => a / b, // spec BigInt::divide (trunc)
  remainder: (a: bigint, b: bigint) => a % b,
  unsignedRightShift: (a: bigint, b: bigint) => {
    // BigInt unsigned right shift (ES2024) is unusual:
    // defined as truncating to max 2**64-1.
    // Here we mimic spec: throw for negative, shift using Uint64
    if (b < 0n) throw new RangeError("Negative shift");
    const mask = (1n << 64n) - 1n;
    return (a & mask) >> b;
  },
  multiply: (a: bigint, b: bigint) => a * b,
  add: (a: bigint, b: bigint) => a + b,
  subtract: (a: bigint, b: bigint) => a - b,
  leftShift: (a: bigint, b: bigint) => a << b,
  signedRightShift: (a: bigint, b: bigint) => a >> b,
  bitwiseAND: (a: bigint, b: bigint) => a & b,
  bitwiseXOR: (a: bigint, b: bigint) => a ^ b,
  bitwiseOR: (a: bigint, b: bigint) => a | b,
} as const;

/* Number operations – matching the spec names */
const NumberOps = {
  exponentiate: (a: number, b: number) => a ** b,
  multiply: (a: number, b: number) => a * b,
  divide: (a: number, b: number) => a / b,
  remainder: (a: number, b: number) => a % b,
  add: (a: number, b: number) => a + b,
  subtract: (a: number, b: number) => a - b,
  leftShift: (a: number, b: number) => a << b,
  signedRightShift: (a: number, b: number) => a >> b,
  unsignedRightShift: (a: number, b: number) => a >>> b,
  bitwiseAND: (a: number, b: number) => a & b,
  bitwiseXOR: (a: number, b: number) => a ^ b,
  bitwiseOR: (a: number, b: number) => a | b,
} as const;

/* Operator lookup tables */
const BigIntOperatorMap: Record<Operator, keyof typeof BigIntOps> = {
  "**": "exponentiate",
  "*": "multiply",
  "/": "divide",
  "%": "remainder",
  "+": "add",
  "-": "subtract",
  "<<": "leftShift",
  ">>": "signedRightShift",
  ">>>": "unsignedRightShift",
  "&": "bitwiseAND",
  "^": "bitwiseXOR",
  "|": "bitwiseOR",
};

const NumberOperatorMap: Record<Operator, keyof typeof NumberOps> = {
  "**": "exponentiate",
  "*": "multiply",
  "/": "divide",
  "%": "remainder",
  "+": "add",
  "-": "subtract",
  "<<": "leftShift",
  ">>": "signedRightShift",
  ">>>": "unsignedRightShift",
  "&": "bitwiseAND",
  "^": "bitwiseXOR",
  "|": "bitwiseOR",
};

/* ────────────────────────────── */
/*  Main Algorithm Implementation */
/* ────────────────────────────── */

export function ApplyStringOrNumericBinaryOperator(lVal: any, opText: Operator, rVal: any): string | number | bigint {
  // Step 1 – Special handling for "+"
  if (opText === "+") {
    const lPrim = ToPrimitive(lVal);
    const rPrim = ToPrimitive(rVal);

    if (typeof lPrim === "string" || typeof rPrim === "string") {
      const lStr = ToString(lPrim);
      const rStr = ToString(rPrim);
      return lStr + rStr;
    }

    lVal = lPrim;
    rVal = rPrim;
  }

  // Numeric path
  const lNum = ToNumeric(lVal);
  const rNum = ToNumeric(rVal);

  if (!SameType(lNum, rNum)) {
    throw new TypeError("Operands must both be Numbers or both be BigInts");
  }

  // BigInt path
  if (typeof lNum === "bigint") {
    const op = BigIntOperatorMap[opText];
    const fn = BigIntOps[op];
    return fn(lNum, rNum as bigint);
  }

  // Number path
  const op = NumberOperatorMap[opText];
  const fn = NumberOps[op];
  return fn(lNum, rNum as number);
}

/**
 * EvaluateStringOrNumericBinaryExpression ( leftOperand, opText, rightOperand )
 * https://tc39.es/ecma262/multipage/abstract-operations.html#sec-evaluatestringornumericbinaryexpression
 */
export function EvaluateStringOrNumericBinaryExpression(
  leftOperand: { evaluate: () => unknown } | (() => unknown) | unknown,
  opText: Operator,
  rightOperand: { evaluate: () => unknown } | (() => unknown) | unknown
): string | number | bigint {
  const lRef = evaluateOperand(leftOperand);
  const lVal = GetValue(lRef);
  const rRef = evaluateOperand(rightOperand);
  const rVal = GetValue(rRef);
  return ApplyStringOrNumericBinaryOperator(lVal, opText, rVal);
}

function evaluateOperand(node: { evaluate: () => unknown } | (() => unknown) | unknown): unknown {
  if (typeof node === "function") return node();
  if (node && typeof (node as any).evaluate === "function") return (node as any).evaluate();
  return node;
}
