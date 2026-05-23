import {
  Value,
  callGenerator,
  evalQ,
  ManagedRealm,
  NormalCompletion,
  ThrowCompletion,
  Agent,
  setSurroundingAgent,
  type TraceRecord,
  type ValueCompletion,
} from "../../trace/index.mts";
import type { ExecuteResponse } from "../types.ts";
import {
  callECMA262Function,
  callECMA262BinaryFunction,
  convertResultToString,
  parseStringToValue,
  detectOperator,
  getOperatorDispatch,
} from "./helpers.ts";
import { serializeNode, toSerializedValue } from "./serialize.ts";

/**
 * Type-conversion endpoint: unary abstract operations (ToNumber, ToString, ToPrimitive, ...).
 */
export async function executeUnaryConversion(
  functionName: string,
  input: string,
  preferredType?: "string" | "number",
): Promise<ExecuteResponse> {
  let inputTrace: TraceRecord | undefined;

  const evalResult = evalQ((_, __) => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const inputResult = parseStringToValue(input, realm);

    if (inputResult instanceof ThrowCompletion) {
      throw new Error(`Failed to parse input: ${inputResult.Value}`);
    }

    const inputValue = (inputResult as NormalCompletion<Value>).Value;
    inputTrace = inputValue.trace;

    const raw = realm.scope<ValueCompletion<Value>>(
      () => callGenerator(callECMA262Function(functionName, inputValue, preferredType)) as ValueCompletion<Value>,
    );

    return raw instanceof NormalCompletion ? raw.Value : raw;
  });

  if (evalResult instanceof ThrowCompletion) {
    return {
      success: false,
      functionName,
      error: `Execution threw: ${evalResult.Value}`,
    };
  }

  const execResult = (evalResult as NormalCompletion<Value | ThrowCompletion>).Value;

  if (execResult instanceof ThrowCompletion) {
    return {
      success: false,
      functionName,
      error: String(execResult.Value),
    };
  }

  const rootNode = inputTrace?.getRoot() ?? execResult.trace.getRoot();
  const root = rootNode ? serializeNode(rootNode) : undefined;
  const result = toSerializedValue(convertResultToString(execResult));

  return {
    success: true,
    functionName,
    result,
    root,
  };
}

/**
 * Equality / relational endpoint: parses expression like "{} == ![]", picks the
 * matching spec algorithm (IsLooselyEqual / IsStrictlyEqual / AbstractRelationalComparison)
 * and applies operator-specific post-processing (negation, swap, undefined → false).
 */
export async function executeBinaryExpression(input: string): Promise<ExecuteResponse> {
  let inputTrace: TraceRecord | undefined;
  let parseError: string | undefined;
  let effectiveAlgoId: string | undefined;
  let detectedOperator: string | undefined;

  const evalResult = evalQ((_, __) => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const detected = detectOperator(input);
    if (!detected) {
      parseError =
        'Expected a binary expression with one of: ==, ===, !=, !==, <, >, <=, >= (e.g. "{} == ![]").';
      return null as unknown as Value;
    }
    const dispatch = getOperatorDispatch(detected.operator);
    detectedOperator = detected.operator;
    effectiveAlgoId = dispatch.algoName;

    const leftSrc = input.slice(0, detected.index).trim();
    const rightSrc = input.slice(detected.index + detected.operator.length).trim();
    if (leftSrc.length === 0 || rightSrc.length === 0) {
      parseError = `Expression "${input}" is missing an operand around "${detected.operator}".`;
      return null as unknown as Value;
    }

    const leftResult = parseStringToValue(leftSrc, realm);
    if (leftResult instanceof ThrowCompletion) {
      parseError = `Failed to parse left operand: ${leftResult.Value}`;
      return null as unknown as Value;
    }
    const rightResult = parseStringToValue(rightSrc, realm);
    if (rightResult instanceof ThrowCompletion) {
      parseError = `Failed to parse right operand: ${rightResult.Value}`;
      return null as unknown as Value;
    }
    const lhsParsed = (leftResult as NormalCompletion<Value>).Value;
    const rhsParsed = (rightResult as NormalCompletion<Value>).Value;
    const lhs = dispatch.swap ? rhsParsed : lhsParsed;
    const rhs = dispatch.swap ? lhsParsed : rhsParsed;
    inputTrace = lhs.trace;

    const raw = realm.scope<ValueCompletion<Value>>(
      () =>
        callGenerator(
          callECMA262BinaryFunction(dispatch.algoName, lhs, rhs, dispatch.leftFirst),
        ) as ValueCompletion<Value>,
    );

    if (raw instanceof ThrowCompletion) {
      return raw;
    }
    const rawValue = raw instanceof NormalCompletion ? raw.Value : (raw as Value);
    const transformed = dispatch.transform(rawValue);
    transformed.trace = rawValue.trace;
    return transformed;
  });

  if (parseError) {
    return { success: false, functionName: "BinaryExpression", error: parseError };
  }

  if (evalResult instanceof ThrowCompletion) {
    return {
      success: false,
      functionName: "BinaryExpression",
      error: `Execution threw: ${evalResult.Value}`,
    };
  }

  const execResult = (evalResult as NormalCompletion<Value | ThrowCompletion>).Value;

  if (execResult instanceof ThrowCompletion) {
    return {
      success: false,
      functionName: "BinaryExpression",
      error: String(execResult.Value),
    };
  }

  const rootNode = inputTrace?.getRoot() ?? execResult.trace.getRoot();
  const root = rootNode ? serializeNode(rootNode) : undefined;
  const result = toSerializedValue(convertResultToString(execResult));

  return {
    success: true,
    functionName: "BinaryExpression",
    result,
    root,
    effectiveAlgoId,
    detectedOperator,
  };
}
