"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";

/**
 * Renders the site header everywhere except embed routes, which are meant to be
 * dropped into an iframe with minimal chrome.
 */
export function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed")) return null;
  return <Header />;
}
