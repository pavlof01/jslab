import { V8_NATIVES_FLAG } from "./v8Intrinsics";

export const PRINT_BYTECODE_FLAG = "--print-bytecode";

export const TRACE_DEOPT_FLAG = "--trace-deopt";

export const DEFAULT_V8_FLAGS: readonly string[] = [PRINT_BYTECODE_FLAG, V8_NATIVES_FLAG];
