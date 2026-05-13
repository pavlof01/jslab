import {
  Value,
  callGenerator,
  evalQ,
  ManagedRealm,
  NormalCompletion,
  ThrowCompletion,
  Agent,
  setSurroundingAgent,
  type ValueCompletion,
} from "../../trace/index.mts";
import type { ExecuteResponse } from "../types.ts";
import { callECMA262Function, convertResultToString, parseStringToValue } from "./helpers.ts";
import { serializeNode, toSerializedValue } from "./serialize.ts";

export async function executeECMA262Function(
  functionName: string,
  input: string,
  preferredType?: "string" | "number",
): Promise<ExecuteResponse> {
  const evalResult = evalQ((_, __) => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();

    const inputResult = parseStringToValue(input, realm);

    if (inputResult instanceof ThrowCompletion) {
      throw new Error(`Failed to parse input: ${inputResult.Value}`);
    }

    const inputValue = (inputResult as NormalCompletion<Value>).Value;

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

  const rootNode = execResult.trace.getRoot();
  const root = rootNode ? serializeNode(rootNode) : undefined;
  const result = toSerializedValue(convertResultToString(execResult));

  return {
    success: true,
    functionName,
    result,
    root,
  };
}
