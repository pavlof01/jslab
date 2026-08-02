import { collectDefaultMetrics, Counter, Histogram, Registry } from "prom-client";

/**
 * Prometheus registry for the API gateway. Exposes default process/Node metrics
 * (event-loop lag, heap, GC, …) plus a few gateway-specific series so the
 * previously-invisible run outcomes, cache behaviour, and rate limiting can be
 * scraped and alerted on.
 */
export const registry = new Registry();

collectDefaultMetrics({ register: registry, prefix: "jslab_api_" });

export const runsTotal = new Counter({
  name: "jslab_api_runs_total",
  help: "Engine run requests by engine and outcome",
  labelNames: ["engine", "outcome"] as const,
  registers: [registry],
});

export const cacheEvents = new Counter({
  name: "jslab_api_cache_events_total",
  help: "Cache events by result (hit/miss/skip_too_large)",
  labelNames: ["result"] as const,
  registers: [registry],
});

export const rateLimited = new Counter({
  name: "jslab_api_rate_limited_total",
  help: "Requests rejected by the rate limiter, by budget",
  labelNames: ["budget"] as const,
  registers: [registry],
});

export const runDuration = new Histogram({
  name: "jslab_api_run_duration_seconds",
  help: "End-to-end /api/run duration",
  labelNames: ["engine", "outcome"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});
