import {
  // Helper functions
  Value,
  callGenerator,
  evalQ,
  // Types
  ManagedRealm,
  NormalCompletion,
  ThrowCompletion,
  Agent,
  setSurroundingAgent,
} from "../../trace/index.mts";
import type { ExecuteResponse } from "../types.ts";
import { convertInputToString, callECMA262Function, convertResultToString, parseStringToValue } from "./helpers.ts";
import { buildFlatTrace, type SerializedValue } from "./flat-trace-builder.ts";

function serializeResult(execResult: Value): SerializedValue {
  const str = convertResultToString(execResult as any);
  const type = (execResult as any).type as string;
  switch (type) {
    case "Number":
      if (str === "NaN") return { type: "Number", value: "NaN" };
      return { type: "Number", value: Number(str) };
    case "String":
      return { type: "String", value: str };
    case "Boolean":
      return { type: "Boolean", value: str === "true" };
    case "BigInt":
      return { type: "BigInt", value: str };
    case "Null":
      return { type: "Null", value: null };
    case "Symbol":
      return { type: "Symbol", value: { id: "sym" } };
    case "Object":
      return { type: "Object", value: { id: "obj", class: "Object" } };
    default:
      return { type: "Undefined" };
  }
}

export async function executeECMA262Function(
  functionName: string,
  inputCode: any,
  preferredType?: "string" | "number",
): Promise<ExecuteResponse> {
  const result = evalQ((_, __) => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const inputStr = convertInputToString(inputCode);
    const inputResult = parseStringToValue(inputStr, realm);

    if (inputResult instanceof ThrowCompletion) {
      throw new Error(`Failed to parse input: ${inputResult.Value}`);
    }

    const inputValue = (inputResult as NormalCompletion<Value>).Value;

    const execCompletion = realm.scope(() => {
      const functionCall = callECMA262Function(functionName, inputValue, preferredType);
      return callGenerator(functionCall);
    });

    if (execCompletion instanceof ThrowCompletion) {
      const errStr = String(execCompletion.Value);
      const roots = inputValue.trace.getRoots();
      return {
        result: { type: "Undefined" } as SerializedValue,
        steps: buildFlatTrace(roots),
        stepCount: inputValue.trace.getStepCount?.() || 1,
        error: errStr,
      };
    }

    const execResult = execCompletion as Value;
    const roots = inputValue.trace.getRoots();

    return {
      result: serializeResult(execResult),
      steps: buildFlatTrace(roots),
      stepCount: inputValue.trace.getStepCount?.() || 1,
    };
  });

  if (result instanceof ThrowCompletion) {
    return {
      success: false,
      functionName,
      result: { type: "Undefined" } as SerializedValue,
      steps: [],
      stepCount: 0,
      error: `Execution threw: ${result.Value}`,
    };
  }

  const normalResult = result as NormalCompletion<any>;
  const { result: execResult, steps, stepCount } = normalResult.Value;

  return {
    success: true,
    functionName,
    result: execResult,
    steps,
    stepCount,
  };
}
