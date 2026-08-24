import { startEngineServer } from "@jslab/engine-runtime";
import { loadConfig } from "./config.js";
import { buildEngineSpec } from "./spec.js";

startEngineServer(buildEngineSpec(loadConfig()));
