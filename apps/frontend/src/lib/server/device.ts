import { headers } from "next/headers";

import { isMobileClient } from "@/lib/device";

export async function isMobileRequest(): Promise<boolean> {
  const requestHeaders = await headers();
  return isMobileClient(requestHeaders.get("user-agent"), requestHeaders.get("sec-ch-ua-mobile"));
}
