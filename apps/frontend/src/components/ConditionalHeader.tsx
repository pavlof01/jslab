"use client";

import { usePathname } from "next/navigation";

import Header from "@/components/Header";

const ConditionalHeader: React.FC = () => {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed")) return null;
  return <Header />;
};

export default ConditionalHeader;
