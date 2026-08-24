/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { remoteSiteUrl, traceServiceEndpoint, traceServiceUrl } from "./traceService";

beforeEach(() => {
  delete process.env.TRACE_SERVICE_URL;
  delete process.env.JSLAB_REMOTE_SITE;
});

afterEach(() => {
  delete process.env.TRACE_SERVICE_URL;
  delete process.env.JSLAB_REMOTE_SITE;
});

describe("traceServiceUrl", () => {
  it("defaults to the port skaffold forwards the service to", () => {
    expect(traceServiceUrl()).toBe("http://localhost:8085");
  });

  it("uses the configured URL and drops a trailing slash", () => {
    process.env.TRACE_SERVICE_URL = "http://trace-service:8080/";
    expect(traceServiceUrl()).toBe("http://trace-service:8080");
  });
});

describe("remoteSiteUrl", () => {
  it("is undefined unless a remote site is configured", () => {
    expect(remoteSiteUrl()).toBeUndefined();
  });

  it("drops a trailing slash so paths append cleanly", () => {
    process.env.JSLAB_REMOTE_SITE = "https://jslab.su/";
    expect(remoteSiteUrl()).toBe("https://jslab.su");
  });
});

describe("traceServiceEndpoint", () => {
  it("hits the service's own path when there is no remote site", () => {
    expect(traceServiceEndpoint("/functions", "/api/trace/functions")).toBe(
      "http://localhost:8085/functions",
    );
  });

  it("hits the remote site's public path when one is configured", () => {
    // A locally-run frontend can borrow production's trace service, but only
    // through its public API — the service itself is not internet-reachable.
    process.env.JSLAB_REMOTE_SITE = "https://jslab.su";
    expect(traceServiceEndpoint("/functions", "/api/trace/functions")).toBe(
      "https://jslab.su/api/trace/functions",
    );
  });

  it("prefers the remote site even when a service URL is also set", () => {
    process.env.TRACE_SERVICE_URL = "http://trace-service:8080";
    process.env.JSLAB_REMOTE_SITE = "https://jslab.su";
    expect(traceServiceEndpoint("/spec/ToNumber", "/api/spec/ToNumber")).toBe(
      "https://jslab.su/api/spec/ToNumber",
    );
  });
});
