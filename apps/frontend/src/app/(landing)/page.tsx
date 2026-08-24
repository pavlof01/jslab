import { Box } from "@chakra-ui/react";
import { AlsoSection } from "./sections/also";
import { FooterSection } from "./sections/footer";
import { HeroSection } from "./sections/hero";
import { IntrinsicsSection } from "./sections/intrinsics";
import { StudiesSection } from "./sections/studies";
import { ToolsSection } from "./sections/tools";

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
