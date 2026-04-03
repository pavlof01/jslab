import { Box } from "@chakra-ui/react";
import { HeroSection } from "./sections/hero";
import { MethodologySection } from "./sections/methodology";
import { BytecodeSection } from "./sections/bytecode";
import { ReadyToDebugSection } from "./sections/readyToDebug";
import { FooterSection } from "./sections/footer";

const bodyFont = "Inter, var(--font-sans), sans-serif";

export default function LandingPage() {
  return (
    <Box as="main" bg="brand.800" color="white" fontFamily={bodyFont} overflow="hidden" position="relative">
      <Box aria-hidden="true" inset={0} pointerEvents="none" position="absolute">
        <Box
          position="absolute"
          top="-10rem"
          left="-8rem"
          h="26rem"
          w="26rem"
          borderRadius="full"
          bg="rgba(249,227,26,0.12)"
          filter="blur(110px)"
        />
        <Box
          position="absolute"
          top="18rem"
          right="-10rem"
          h="24rem"
          w="24rem"
          borderRadius="full"
          bg="rgba(255,255,255,0.05)"
          filter="blur(140px)"
        />
      </Box>

      <HeroSection />
      <MethodologySection />
      <BytecodeSection />
      <ReadyToDebugSection />
      <FooterSection />
    </Box>
  );
}
