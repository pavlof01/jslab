"use client";

import { useBreakpointValue } from "@chakra-ui/react";
import { createContext, type ReactNode, useContext } from "react";

const MobileHintContext = createContext(false);

type Props = { mobile: boolean; children: ReactNode };

const LayoutHintProvider: React.FC<Props> = ({ mobile, children }) => {
  return <MobileHintContext.Provider value={mobile}>{children}</MobileHintContext.Provider>;
};

export const useStackedLayout = (): boolean => {
  const mobile = useContext(MobileHintContext);
  return (
    useBreakpointValue({ base: true, md: false }, { fallback: mobile ? "base" : "md" }) ?? mobile
  );
};

export default LayoutHintProvider;
