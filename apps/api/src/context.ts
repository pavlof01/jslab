import type { Redis } from "ioredis";

import type { ApiConfig } from "./config.js";

/**
 * Everything a route needs from the outside world, handed in rather than
 * imported. `buildApp` takes this, so routes can be exercised with `app.inject`
 * against a fake Redis instead of requiring a live one at import time.
 */
export interface AppContext {
  config: ApiConfig;
  redis: Redis;
}
