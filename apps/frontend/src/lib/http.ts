/**
 * Client-side reads of our own route handlers, for the cases where a failure
 * means "show nothing" rather than "tell the user". Each call site used to
 * hand-roll the same fetch → check ok → reject → swallow chain.
 */

export async function getText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

export async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}
