export type NavItem = {
  label: string;
  description: string;
  href: string;
  external?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};
