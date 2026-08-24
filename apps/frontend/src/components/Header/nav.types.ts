import { NAV_GROUPS, type NavEntry, navEntries } from "@/lib/tools";

export type NavItem = NavEntry;

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const navSections: NavSection[] = NAV_GROUPS.map(({ group, label }) => ({
  label,
  items: navEntries(group),
}));
