import { engineEnvBase, loadEnv } from "@jslab/engine-runtime";
import { z } from "zod";

const envSchema = engineEnvBase.extend({
  SM_PATH: z.string().default("js"),
});

export type EngineConfig = z.infer<typeof envSchema>;

export function loadConfig(): EngineConfig {
  return loadEnv(envSchema, "engine-spidermonkey");
}
