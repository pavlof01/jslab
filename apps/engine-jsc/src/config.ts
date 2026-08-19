import { engineEnvBase, loadEnv } from "@jslab/engine-runtime";
import { z } from "zod";

const envSchema = engineEnvBase
  .extend({
    // Use a name that doesn't start with "JSC_" because JSC itself parses "JSC_*" env vars as VM options.
    JSCSHELL_PATH: z.string().optional(),
    // Back-compat for older manifests.
    JSC_PATH: z.string().optional(),
  })
  .transform(({ JSCSHELL_PATH, JSC_PATH, ...rest }) => ({
    ...rest,
    JSCSHELL_PATH: JSCSHELL_PATH ?? JSC_PATH ?? "jsc",
  }));

export type EngineConfig = z.infer<typeof envSchema>;

export function loadConfig(): EngineConfig {
  return loadEnv(envSchema, "engine-jsc");
}
