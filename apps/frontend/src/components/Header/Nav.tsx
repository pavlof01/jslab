"use client";

import { Button } from "@chakra-ui/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface NavLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
  showStatus?: boolean;
}

const navLinks: NavLink[] = [
  { href: "/playground", label: "Playground", showStatus: true },
  { href: "/abstract-functions-visualizer", label: "Abstract Functions Visualizer" },
];

const Nav = () => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname === "/landing";
    }
    return pathname.includes(href);
  };

  return (
    <nav className="md:flex items-center gap-3 lg:gap-4 flex-1 justify-center">
      {navLinks.map((link) => {
        const active = isActive(link.href);

        return (
          <Button
            asChild
            key={link.href}
            variant={active ? "solid" : "ghost"}
            colorPalette={active ? "yellow" : "white"}
            size="md"
          >
            <Link href={link.href}>{link.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
};

export default Nav;
