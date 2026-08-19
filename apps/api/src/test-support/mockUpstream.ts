import { getGlobalDispatcher, MockAgent, setGlobalDispatcher } from "undici";

/**
 * Intercepts the gateway's outgoing calls at undici's dispatcher, which is where
 * `upstream.ts` makes them. Nothing is injected into `buildApp` for this: the
 * production path stays exactly the one that runs in production.
 */
export interface MockUpstream {
  /** Reply to one POST to `origin + path`. */
  reply(origin: string, path: string, status: number, body: unknown, headers?: Record<string, string>): void;
  /** Fail the next POST the way an unreachable service does. */
  refuse(origin: string, path: string, error?: Error): void;
  /** How many requests the interceptors actually received. */
  calls(): { origin: string; path: string; body: string }[];
  /** Throws unless every registered interceptor was used — counts refusals too. */
  assertAllUsed(): void;
  restore(): Promise<void>;
}

export function mockUpstream(): MockUpstream {
  const previous = getGlobalDispatcher();
  const agent = new MockAgent();
  agent.disableNetConnect();
  setGlobalDispatcher(agent);

  const seen: { origin: string; path: string; body: string }[] = [];

  return {
    reply(origin, path, status, body, headers = { "content-type": "application/json" }) {
      agent
        .get(origin)
        .intercept({ path, method: "POST" })
        // Recorded here rather than in the matcher: undici consults a matcher
        // more than once while choosing an interceptor, and would double-count.
        .reply(status, (opts: { body?: unknown }) => {
          seen.push({ origin, path, body: String(opts.body ?? "") });
          return typeof body === "string" ? body : JSON.stringify(body);
        }, { headers });
    },
    refuse(origin, path, error = new Error("connect ECONNREFUSED")) {
      agent.get(origin).intercept({ path, method: "POST" }).replyWithError(error);
    },
    calls: () => seen,
    assertAllUsed: () => agent.assertNoPendingInterceptors(),
    async restore() {
      setGlobalDispatcher(previous);
      await agent.close();
    },
  };
}
