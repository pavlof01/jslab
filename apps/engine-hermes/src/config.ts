import { engineEnvBase, loadEnv } from "@jslab/engine-runtime";
import { z } from "zod";

const envSchema = engineEnvBase.extend({
  HERMES_PATH: z.string().default("/usr/bin/hermes"),
});

export type EngineConfig = z.infer<typeof envSchema>;

export function loadConfig(): EngineConfig {
  return loadEnv(envSchema, "engine-hermes");
}
