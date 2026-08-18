"use client";

import { usePathname } from "next/navigation";

import type { NavSection } from "./nav.types";

export function useSectionActive(): (section: NavSection) => boolean {
  const pathname = usePathname();
  const isActivePath = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (section) => section.items.some((item) => !item.external && isActivePath(item.href));
}
