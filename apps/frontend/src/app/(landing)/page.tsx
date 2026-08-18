import { Box } from "@chakra-ui/react";

import { HeroSection } from "./sections/hero";
import { IntrinsicsSection } from "./sections/intrinsics";
import { StudiesSection } from "./sections/studies";
import { ToolsSection } from "./sections/tools";
import { AlsoSection } from "./sections/also";
import { FooterSection } from "./sections/footer";

export default function LandingPage() {
  return (
    <Box as="main" id="top" bg="surface.base" color="ink.1" overflowX="hidden">
      <HeroSection />
      <IntrinsicsSection />
      <StudiesSection />
      <ToolsSection />
      <AlsoSection />
      <FooterSection />
    </Box>
  );
}
