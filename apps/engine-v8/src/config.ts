import { engineEnvBase, loadEnv } from "@jslab/engine-runtime";
import { z } from "zod";

// Everything shared with the other engine services lives in engineEnvBase; only
// the fields below are genuinely V8's.
const envSchema = engineEnvBase.extend({
  D8_PATH: z.string().default("/opt/v8/d8"),
  // V8 old-space heap cap (MB). Kept under the pod memory limit so a greedy
  // script hits a JS RangeError instead of OOM-killing the whole pod.
  MAX_HEAP_MB: z.coerce.number().int().positive().default(1536),
});

export type EngineConfig = z.infer<typeof envSchema>;

export function loadConfig(): EngineConfig {
  return loadEnv(envSchema, "engine-v8");
}
