import {
  Agent,
  callGenerator,
  evalQ,
  ManagedRealm,
  NormalCompletion,
  setSurroundingAgent,
  ThrowCompletion,
  type TraceRecord,
  type Value,
  type ValueCompletion,
} from "../../trace/index.mts";
import {
  callBinaryAlgorithm,
  callUnaryOperation,
  getOperatorDispatch,
  SUPPORTED_OPERATORS,
} from "../operations.ts";
import type { ExecuteResponse } from "../types.ts";
import { describeValue, detectOperator, parseStringToValue } from "./parse.ts";
import { fromEngineValue, serializeNode } from "./serialize.ts";

/**
 * Both entry points end the same way: unwrap the completion (a throw can
 * surface either from `evalQ` or from the algorithm itself), pick the trace
 * root, and serialize. Only the extra fields differ, so the tail lives here
 * once rather than being copied either side of the two evaluations.
 */
/**
 * What a caught failure says about itself. engine262 throws completions, not
 * Errors, and `String(completion)` is "[object Object]" — the value inside is
 * the one that can describe itself.
 */
function explain(error: unknown, realm?: ManagedRealm): string {
  if (error instanceof ThrowCompletion) return describeValue(error.Value, realm);
  return error instanceof Error ? error.message : String(error);
}

function finishTrace(
  functionName: string,
  evalResult: unknown,
  inputTrace: TraceRecord | undefined,
  extra: Partial<ExecuteResponse> = {},
  realm?: ManagedRealm,
): ExecuteResponse {
  if (evalResult instanceof ThrowCompletion) {
    return {
      success: false,
      functionName,
      error: `Execution threw: ${describeValue(evalResult.Value, realm)}`,
    };
  }

  const execResult = (evalResult as NormalCompletion<Value | ThrowCompletion>).Value;
  if (execResult instanceof ThrowCompletion) {
    return { success: false, functionName, error: describeValue(execResult.Value, realm) };
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
  // Kept outside the evaluation so a thrown value can still be rendered against
  // the realm it came from.
  let realm: ManagedRealm | undefined;
  // Rendered while the evaluation is still on the stack: `inspect` needs the
  // agent and the realm that produced the value, and both are gone by the time
  // the completion reaches `finishTrace`.
  let thrownText: string | undefined;

  const evalResult = evalQ((_, __) => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    realm = new ManagedRealm();

    let inputResult: ReturnType<typeof parseStringToValue>;
    try {
      inputResult = parseStringToValue(input, realm);
    } catch (error) {
      // A syntax error arrives as a thrown Error, not a completion.
      parseError = error instanceof Error ? error.message : String(error);
      return null as unknown as Value;
    }

    if (inputResult instanceof ThrowCompletion) {
      parseError = `Failed to parse input: ${describeValue(inputResult.Value, realm)}`;
      return null as unknown as Value;
    }

    const inputValue = (inputResult as NormalCompletion<Value>).Value;
    inputTrace = inputValue.trace;

    let raw: ValueCompletion<Value>;
    try {
      raw = realm.scope<ValueCompletion<Value>>(
        () =>
          callGenerator(
            callUnaryOperation(functionName, inputValue, preferredType),
          ) as ValueCompletion<Value>,
      );
    } catch (error) {
      // An operation this service does not implement, or a conversion that
      // threw, is the caller's business — not a service failure.
      parseError = explain(error, realm);
      return null as unknown as Value;
    }

    const returned = raw instanceof NormalCompletion ? raw.Value : raw;
    // A throw arrives either as the completion itself or wrapped in a normal one.
    if (returned instanceof ThrowCompletion) thrownText = describeValue(returned.Value, realm);

    return returned;
  });

  if (parseError) return { success: false, functionName, error: parseError };
  if (thrownText) return { success: false, functionName, error: thrownText };

  return finishTrace(functionName, evalResult, inputTrace, {}, realm);
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
  let thrownText: string | undefined;

  const evalResult = evalQ((_, __) => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const detected = detectOperator(input);
    if (!detected) {
      parseError = `Expected a binary expression with one of: ${SUPPORTED_OPERATORS.join(
        ", ",
      )} (e.g. "{} == ![]").`;
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

    let leftResult: ReturnType<typeof parseStringToValue>;
    try {
      leftResult = parseStringToValue(leftSrc, realm);
    } catch (error) {
      // Name the side, the way the completion branch below already does.
      parseError = `Failed to parse left operand "${leftSrc}": ${explain(error, realm)}`;
      return null as unknown as Value;
    }
    if (leftResult instanceof ThrowCompletion) {
      parseError = `Failed to parse left operand: ${leftResult.Value}`;
      return null as unknown as Value;
    }
    let rightResult: ReturnType<typeof parseStringToValue>;
    try {
      rightResult = parseStringToValue(rightSrc, realm);
    } catch (error) {
      // Name the side, the way the completion branch below already does.
      parseError = `Failed to parse right operand "${rightSrc}": ${explain(error, realm)}`;
      return null as unknown as Value;
    }
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
          callBinaryAlgorithm(dispatch.algoName, lhs, rhs, dispatch.leftFirst),
        ) as ValueCompletion<Value>,
    );

    if (raw instanceof ThrowCompletion) {
      thrownText = describeValue(raw.Value, realm);
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
  if (thrownText) {
    return {
      success: false,
      functionName: "BinaryExpression",
      error: thrownText,
      effectiveAlgoId,
      detectedOperator,
    };
  }

  return finishTrace("BinaryExpression", evalResult, inputTrace, {
    effectiveAlgoId,
    detectedOperator,
  });
}
