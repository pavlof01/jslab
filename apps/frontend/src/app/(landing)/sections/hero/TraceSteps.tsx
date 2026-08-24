import { Box, Flex, Grid, Text } from "@chakra-ui/react";

import type { Trace } from "../../landing-data";
import { cursorName, stepName, verdictName } from "./traceCycle";

const looping = (name: string, totalMs: number) => ({
  animationName: name,
  animationDuration: `${totalMs}ms`,
  animationIterationCount: "infinite" as const,
  animationTimingFunction: "linear" as const,
});

export function TraceSteps({
  trace,
  index,
  totalMs,
}: {
  trace: Trace;
  index: number;
  totalMs: number;
}) {
  return (
    <Box mt={{ base: 5, md: "26px" }}>
      {trace.steps.map(([op, detail], step) => (
        <Grid
          key={`${op}-${detail}`}
          data-reveal=""
          templateColumns="20px 10px minmax(0, 1fr)"
          alignItems="baseline"
          columnGap="12px"
          py="10px"
          borderTopWidth="1px"
          borderColor="rule.row"
          opacity={0.14}
          {...looping(stepName(index, step), totalMs)}
        >
          <Text textStyle="codeSm" color="ink.5">
            {String(step + 1).padStart(2, "0")}
          </Text>
          <Text
            data-cursor=""
            textStyle="codeSm"
            aria-hidden="true"
            color="accent"
            opacity={0}
            {...looping(cursorName(index, step), totalMs)}
          >
            ▸
          </Text>

          <Flex wrap="wrap" align="baseline" gap="2px 14px" minW={0}>
            <Text
              textStyle="codeXl"
              flex="0 1 auto"
              minW="min(158px, 100%)"
              color="ink.1"
              overflowWrap="anywhere"
            >
              {op}
            </Text>
            <Text textStyle="codeLg" flex="1 1 190px" minW={0} color="ink.2">
              {detail}
            </Text>
          </Flex>
        </Grid>
      ))}

      <Flex
        data-reveal=""
        align="baseline"
        gap="14px"
        pt="12px"
        borderTopWidth="1px"
        borderColor="rule.accentDim"
        opacity={0}
        {...looping(verdictName(index), totalMs)}
      >
        <Text textStyle="codeXl" flex="0 0 30px" color="accent">
          →
        </Text>
        <Text fontFamily="mono" fontSize="16px" color="accent">
          {trace.result}
        </Text>
      </Flex>
    </Box>
  );
}

export { looping };
