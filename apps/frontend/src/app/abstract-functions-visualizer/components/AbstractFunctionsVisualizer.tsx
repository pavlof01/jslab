import { Box } from "@chakra-ui/react";

import type {
  AlgoCategory,
  VisualizerInitialData,
} from "@/app/abstract-functions-visualizer/model";
import { fallbackInitialData } from "@/app/abstract-functions-visualizer/model";
import VisualizerStoreProvider from "@/app/abstract-functions-visualizer/StoreProvider";

import { HINTS } from "./hints";
import VisualizerScreen from "./VisualizerScreen";

type AbstractFunctionsVisualizerProps = {
  initialCategory?: AlgoCategory;
  initialData?: VisualizerInitialData;
};

const AbstractFunctionsVisualizer: React.FC<AbstractFunctionsVisualizerProps> = ({
  initialCategory = "typeConversion",
  initialData,
}) => {
  const resolved = initialData ?? fallbackInitialData(initialCategory);

  return (
    <VisualizerStoreProvider initialData={resolved}>
      <Box
        display="flex"
        flexDirection="column"
        bg="surface.base"
        minH="calc(100dvh - {sizes.header})"
      >
        <Box
          as="main"
          display="flex"
          flexDirection="column"
          flex="none"
          h={{ base: "auto", md: "calc(100dvh - {sizes.header})" }}
          minH={{ base: 0, md: "480px" }}
        >
          <VisualizerScreen initialData={resolved} hint={HINTS[resolved.category]} />
        </Box>
      </Box>
    </VisualizerStoreProvider>
  );
};

export default AbstractFunctionsVisualizer;
