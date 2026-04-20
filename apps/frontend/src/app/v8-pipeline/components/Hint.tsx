import { Box, Text } from "@chakra-ui/react";
import { StageId } from "./PipelineClient";

const JIT_HINTS: Partial<Record<StageId, string>> = {
  tokens:
    "This tokenizer runs entirely in the browser and approximates V8's lexer. " +
    "The real V8 scanner is written in C++ and handles edge cases (Unicode escapes, template literal nesting, regex disambiguation) differently.",
  sparkplug:
    "Sparkplug compiles bytecode directly to machine code without optimization passes. " +
    "It kicks in after a function has been interpreted a few times (~dozens of calls).",
  maglev:
    "The JIT mid-tier compiler only processes hot functions. " + "Add a loop that calls your function ~500+ times.",
  turbofan:
    "The optimizing JIT only processes very hot, type-stable functions. " +
    "Add a loop that calls your function ~10 000+ times.",
};

type HintProps = {
  stageId: StageId;
};

const Hint: React.FC<HintProps> = ({ stageId }) => {
  const hint = JIT_HINTS[stageId];
  if (!hint) return null;
  return (
    <Box bg="brandAlpha.50" py={2} px={4}>
      <Text fontSize="xs" color="whiteAlpha.600">
        <Text as="span" color="brand.300" fontWeight="700">
          Tip:{" "}
        </Text>
        {hint}
      </Text>
    </Box>
  );
};

export default Hint;
