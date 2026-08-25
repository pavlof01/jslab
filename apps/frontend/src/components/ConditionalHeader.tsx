"use client";

import { usePathname } from "next/navigation";

import { Header } from "@/components/Header";

export function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed")) return null;
  return <Header />;
}
