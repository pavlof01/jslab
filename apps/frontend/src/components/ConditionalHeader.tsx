"use client";

import { usePathname } from "next/navigation";

type Props = { children: React.ReactNode };

const ConditionalHeader: React.FC<Props> = ({ children }) => {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed")) return null;
  return children;
};

export default ConditionalHeader;
