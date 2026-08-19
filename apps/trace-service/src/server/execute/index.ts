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
import { callBinaryAlgorithm, callUnaryOperation, getOperatorDispatch } from "../operations.ts";
import { detectOperator, parseStringToValue } from "./parse.ts";
import { fromEngineValue, serializeNode } from "./serialize.ts";

/**
 * Both entry points end the same way: unwrap the completion (a throw can
 * surface either from `evalQ` or from the algorithm itself), pick the trace
 * root, and serialize. Only the extra fields differ, so the tail lives here
 * once rather than being copied either side of the two evaluations.
 */
function finishTrace(
  functionName: string,
  evalResult: unknown,
  inputTrace: TraceRecord | undefined,
  extra: Partial<ExecuteResponse> = {},
): ExecuteResponse {
  if (evalResult instanceof ThrowCompletion) {
    return { success: false, functionName, error: `Execution threw: ${evalResult.Value}` };
  }

  const execResult = (evalResult as NormalCompletion<Value | ThrowCompletion>).Value;
  if (execResult instanceof ThrowCompletion) {
    return { success: false, functionName, error: String(execResult.Value) };
  }

  const rootNode = inputTrace?.getRoot() ?? execResult.trace.getRoot();

  return {
    success: true,
    functionName,
    result: fromEngineValue(execResult),
    root: rootNode ? serializeNode(rootNode) : undefined,
    ...extra,
  };
}

/**
 * Type-conversion endpoint: unary abstract operations (ToNumber, ToString, ToPrimitive, ...).
 */
export async function executeUnaryConversion(
  functionName: string,
  input: string,
  preferredType?: "string" | "number",
): Promise<ExecuteResponse> {
  let inputTrace: TraceRecord | undefined;
  // A snippet that does not parse is the caller's mistake, so it leaves here the
  // way the binary path already reports one — as a failed trace the route turns
  // into a 400, rather than an exception the route can only call a 500.
  let parseError: string | undefined;

  const evalResult = evalQ((_, __) => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const inputResult = parseStringToValue(input, realm);

    if (inputResult instanceof ThrowCompletion) {
      parseError = `Failed to parse input: ${inputResult.Value}`;
      return null as unknown as Value;
    }

    const inputValue = (inputResult as NormalCompletion<Value>).Value;
    inputTrace = inputValue.trace;

    const raw = realm.scope<ValueCompletion<Value>>(
      () => callGenerator(callUnaryOperation(functionName, inputValue, preferredType)) as ValueCompletion<Value>,
    );

    return raw instanceof NormalCompletion ? raw.Value : raw;
  });

  if (parseError) return { success: false, functionName, error: parseError };

  return finishTrace(functionName, evalResult, inputTrace);
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
      () => callGenerator(callBinaryAlgorithm(dispatch.algoName, lhs, rhs, dispatch.leftFirst)) as ValueCompletion<Value>,
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

  return finishTrace("BinaryExpression", evalResult, inputTrace, { effectiveAlgoId, detectedOperator });
}
