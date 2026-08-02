import { Box } from "@chakra-ui/react";
import { HeroSection } from "./sections/hero";
import { MethodologySection } from "./sections/methodology";
import { ToolsSection } from "./sections/tools";
import { BytecodeSection } from "./sections/bytecode";
import { AbstractFunctionsSection } from "./sections/abstractFunctions";
import { ReadyToDebugSection } from "./sections/readyToDebug";
import { FooterSection } from "./sections/footer";
import { getVisualizerInitialData } from "@/app/abstract-functions-visualizer/server-data";

const bodyFont = "Inter, var(--font-sans), sans-serif";

export default async function LandingPage() {
  const abstractFunctionsInitialData = await getVisualizerInitialData("typeConversion");

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
          bg="brandAlpha.100"
          filter="blur(110px)"
        />
        <Box
          position="absolute"
          top="18rem"
          right="-10rem"
          h="24rem"
          w="24rem"
          borderRadius="full"
          bg="surface.200"
          filter="blur(140px)"
        />
      </Box>

      <HeroSection />
      <ToolsSection />
      <MethodologySection />
      <BytecodeSection />
      <AbstractFunctionsSection initialData={abstractFunctionsInitialData} />
      <ReadyToDebugSection />
      <FooterSection />
    </Box>
  );
}
