import { Box, Text } from "@chakra-ui/react";

import { ENGINE_CAPABILITIES } from "@/lib/engineCapabilities";
import { EngineKey } from "@/lib/types";

type EngineHintProps = {
  engineKey: EngineKey;
  /** Drop the quirk lines where vertical space is scarce (the iframe embed). */
  compact?: boolean;
};

/**
 * Per-engine capability note above the output. Same visual language as the
 * v8-pipeline stage hints so the two pages read as one product.
 */
const EngineHint: React.FC<EngineHintProps> = ({ engineKey, compact = false }) => {
  const capability = ENGINE_CAPABILITIES[engineKey];

  return (
    <Box bg="brandAlpha.50" py={2} px={4} borderRadius="md">
      <Text fontSize="xs" color="whiteAlpha.600">
        <Text as="span" color="brand.300" fontWeight="700">
          {capability.executes ? "Executes: " : "Compile-only: "}
        </Text>
        {capability.summary}
      </Text>
      {!compact &&
        capability.quirks.map((quirk) => (
          <Text key={quirk} fontSize="xs" color="whiteAlpha.400" mt={1}>
            {quirk}
          </Text>
        ))}
    </Box>
  );
};

export default EngineHint;
