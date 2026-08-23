import { getGlobalDispatcher, MockAgent, setGlobalDispatcher } from "undici";

/**
 * Intercepts the gateway's outgoing calls at undici's dispatcher, which is where
 * `upstream.ts` makes them. Nothing is injected into `buildApp` for this: the
 * production path stays exactly the one that runs in production.
 */
export interface MockUpstream {
  /** Reply to one POST to `origin + path`. */
  reply(origin: string, path: string, status: number, body: unknown, headers?: Record<string, string>): void;
  replyGet(origin: string, path: string, status: number, body: unknown, persist?: boolean): void;
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

  function intercept(
    method: "GET" | "POST",
    origin: string,
    path: string,
    status: number,
    body: unknown,
    headers: Record<string, string>,
    persist: boolean,
  ): void {
    const interceptor = agent
      .get(origin)
      .intercept({ path, method })
      .reply(status, (opts: { body?: unknown }) => {
        seen.push({ origin, path, body: String(opts.body ?? "") });
        return typeof body === "string" ? body : JSON.stringify(body);
      }, { headers });
    if (persist) interceptor.persist();
  }

  return {
    reply(origin, path, status, body, headers = { "content-type": "application/json" }) {
      intercept("POST", origin, path, status, body, headers, false);
    },
    replyGet(origin, path, status, body, persist = false) {
      intercept("GET", origin, path, status, body, { "content-type": "application/json" }, persist);
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
