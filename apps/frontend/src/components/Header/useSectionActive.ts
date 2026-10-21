"use client";

import { usePathname } from "next/navigation";

import { isTopLinkActive, isUnderPath, type TopLink } from "@/lib/tools";

import type { NavSection } from "./nav.types";

export function useSectionActive(): (section: NavSection) => boolean {
  const pathname = usePathname();
  const isActivePath = (href: string) => isUnderPath(pathname, href);
  return (section) => section.items.some((item) => !item.external && isActivePath(item.href));
}

export function useTopLinkActive(): (link: TopLink) => boolean {
  const pathname = usePathname();
  return (link) => isTopLinkActive(pathname, link);
}
