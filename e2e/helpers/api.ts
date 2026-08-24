import type { APIRequestContext } from "@playwright/test";

export const GATEWAY_URL = process.env.E2E_GATEWAY_URL ?? "http://localhost:8080";

export async function runViaProxy(
  request: APIRequestContext,
  body: Record<string, unknown>,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await request.post("/api/run", { data: body, failOnStatusCode: false });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
  }
  return { status: res.status(), json };
}

export function uniqueSnippet(tag: string): string {
  return `/* ${tag} ${Math.random().toString(36).slice(2)} */ 1 + 1`;
}
