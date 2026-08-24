import { Link, type LinkProps } from "@chakra-ui/react";
import NextLink from "next/link";

export type QuietLinkProps = {
  href: string;
  mono?: boolean;
  external?: boolean;
} & Omit<LinkProps, "href">;

export function QuietLink({
  href,
  mono = false,
  external = false,
  children,
  ...rest
}: QuietLinkProps) {
  const typeface = mono ? "mono" : "sans";

  if (external) {
    return (
      <Link href={href} target="_blank" rel="noreferrer" typeface={typeface} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <Link asChild typeface={typeface} {...rest}>
      <NextLink href={href}>{children}</NextLink>
    </Link>
  );
}
