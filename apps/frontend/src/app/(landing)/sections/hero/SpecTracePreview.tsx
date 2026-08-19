import { Box, Flex, Grid, Text } from "@chakra-ui/react";

import { QuietLink } from "@/components/ui";
import { Band } from "@/components/ui/band";
import { Label } from "@/components/ui/label";

import { TRACES } from "../../landing-data";
import { looping, TraceSteps } from "./TraceSteps";
import { TraceTab } from "./TraceTab";
import { blockName, cycleStylesheet, planCycle, verdictName } from "./traceCycle";

const cycle = planCycle(TRACES);
const stylesheet = cycleStylesheet(TRACES);

export function SpecTracePreview() {
  return (
    <Flex layerStyle="panel" direction="column" minW={0}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the stylesheet is
          generated at module scope by cycleStylesheet() from TRACES, a constant in
          this repo. No user input reaches it, and <style> takes no children. */}
      <style dangerouslySetInnerHTML={{ __html: stylesheet }} />

      <Band edge="top">
        <Label>spec trace</Label>
        <Flex wrap="wrap" gap={{ base: "10px", md: "20px" }}>
          {TRACES.map((trace, index) => (
            <TraceTab key={trace.label} label={trace.label} index={index} totalMs={cycle.totalMs} />
          ))}
        </Flex>
      </Band>

      <Grid px={{ base: 4, md: "30px" }} pt={{ base: 5, md: "26px" }} pb={{ base: 4, md: "20px" }}>
        {TRACES.map((trace, index) => (
          <Box
            key={trace.label}
            data-trace={index}
            gridArea="1 / 1"
            opacity={0}
            visibility="hidden"
            {...looping(blockName(index), cycle.totalMs)}
          >
            <Text
              fontFamily="mono"
              fontSize={{ base: "19px", md: "clamp(22px, 2.6vw, 28px)" }}
              lineHeight="1.25"
              letterSpacing="-0.01em"
              color="ink.1"
              wordBreak="break-word"
            >
              {trace.expr}
              <Text as="span" color="ink.6">
                {" ⟶ "}
              </Text>
              <Text
                data-reveal=""
                as="span"
                color="accent"
                opacity={0}
                {...looping(verdictName(index), cycle.totalMs)}
              >
                {trace.result}
              </Text>
            </Text>

            <TraceSteps trace={trace} index={index} totalMs={cycle.totalMs} />
          </Box>
        ))}
      </Grid>

      <Box mt="auto">
        <Band edge="bottom">
          <Grid>
            {TRACES.map((trace, index) => (
              <Text
                key={trace.label}
                data-trace={index}
                gridArea="1 / 1"
                textStyle="codeSm"
                color="ink.label"
                opacity={0}
                visibility="hidden"
                {...looping(blockName(index), cycle.totalMs)}
              >
                {trace.steps.length} operations · in the order ECMA-262 called them
              </Text>
            ))}
          </Grid>
          <QuietLink href="/equality" mono>
            open Equality Operators →
          </QuietLink>
        </Band>
      </Box>
    </Flex>
  );
}
