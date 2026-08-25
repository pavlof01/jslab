import { ENGINE_KINDS } from "@jslab/engine-runtime";

import type { ApiConfig } from "./config.js";
import type { EngineKind } from "./types.js";

export { ENGINE_KINDS };

/**
 * Where each engine service lives.
 *
 * The return type is what does the work: `Record<EngineKind, string>` means a
 * new entry in the flag catalog turns into a compile error here — the one place
 * that genuinely needs a human decision (which URL?) — instead of an
 * `undefined` base URL discovered at runtime on the first request.
 */
export function engineBaseUrls(config: ApiConfig): Record<EngineKind, string> {
  return {
    v8: config.ENGINE_V8_URL,
    hermes: config.ENGINE_HERMES_URL,
    sm: config.ENGINE_SM_URL,
    jsc: config.ENGINE_JSC_URL,
  };
}
