const MOBILE_USER_AGENT = /Mobi|iPhone|iPod/i;

export function isMobileClient(userAgent: string | null, mobileHint: string | null): boolean {
  if (mobileHint) return mobileHint === "?1";
  return MOBILE_USER_AGENT.test(userAgent ?? "");
}
