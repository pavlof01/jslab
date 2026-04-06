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

    const functionCall = callECMA262Function(functionName, inputValue, preferredType);
    const execCompletion = callGenerator(functionCall);

    if (execCompletion instanceof ThrowCompletion) {
      return {
        resultValue: String(execCompletion.Value),
        resultType: "error",
        trace: inputValue.trace.getEntries(),
        stepCount: inputValue.trace.getStepCount?.() || 1,
        error: String(execCompletion.Value),
      };
    }

    const execResult = execCompletion as Value;
    const resultValueStr = convertResultToString(execResult);

    return {
      resultValue: resultValueStr,
      resultType: execResult.type.toLowerCase(),
      trace: inputValue.trace.getEntries(),
      stepCount: inputValue.trace.getStepCount?.() || 1,
    };
  });

  if (result instanceof ThrowCompletion) {
    return {
      success: false,
      functionName,
      resultValue: "",
      resultType: "error",
      trace: [],
      stepCount: 0,
      error: `Execution threw: ${result.Value}`,
    };
  }

  const normalResult = result as NormalCompletion<any>;
  const { resultValue, resultType, trace, stepCount } = normalResult.Value;

  return {
    success: true,
    functionName,
    resultValue,
    resultType,
    trace,
    stepCount,
  };
}
