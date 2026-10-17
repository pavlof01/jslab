"use client";

import { Badge, Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { useMemo } from "react";

import AnnotationAlerts from "@/components/OutputsPanel/components/AnnotationAlerts";
import { ClickPopover } from "@/components/ui";
import { matchAnnotations, type OutputAnnotation, parseAnnotationSource } from "@/lib/annotations";
import { parseV8Trace, summarizeV8Trace, type V8TraceEvent } from "@/lib/parseV8Trace";

const KIND_STYLE: Record<V8TraceEvent["kind"], { label: string; color: string }> = {
  optimize: { label: "OPT", color: "status.ok" },
  deopt: { label: "DEOPT", color: "status.error" },
  ic: { label: "IC", color: "status.info" },
};

type EventAnnotationsProps = { raw: string; annotations: OutputAnnotation[] };

export const EventAnnotations: React.FC<EventAnnotationsProps> = ({ raw, annotations }) => {
  if (!annotations.length) return null;

  return (
    <HStack gap={2} wrap="wrap" mt={1}>
      {annotations.map((annotation) => (
        <ClickPopover key={annotation.id} title={annotation.title} content={annotation.text}>
          <Button
            variant="annotation"
            typeface="code"
            type="button"
            data-output-annotation={annotation.id}
          >
            {raw.slice(annotation.start, annotation.end)}
          </Button>
        </ClickPopover>
      ))}
    </HStack>
  );
};

type Props = { output: string; source?: string };

const DeoptView: React.FC<Props> = ({ output, source = "" }) => {
  const events = useMemo(() => parseV8Trace(output), [output]);
  const summary = useMemo(() => summarizeV8Trace(events), [events]);
  const rules = useMemo(() => parseAnnotationSource(source), [source]);
  const eventAnnotations = useMemo(
    () => events.map((event) => matchAnnotations(rules, event.raw).annotations),
    [events, rules],
  );

  if (!output.trim()) {
    return (
      <Box p={6}>
        <Text color="ink.label" fontSize="sm">
          Run to trace optimization and deoptimization events. Deopts happen when V8 has to throw
          away optimized code — usually because a value’s type changed from what the optimizer
          assumed.
        </Text>
      </Box>
    );
  }

  if (events.length === 0) {
    return (
      <Box p={6}>
        <Text color="ink.2" fontSize="sm">
          No optimization or deoptimization events. Try a hot loop (e.g. call a function a few
          hundred times) so V8 tiers it up — then feed it a changing type to force a deopt.
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" gap={3} p={4}>
      <AnnotationAlerts diagnostics={rules.diagnostics} />
      <HStack gap={2} wrap="wrap">
        <Badge colorPalette="green">{summary.optimize} optimized</Badge>
        <Badge colorPalette="red">{summary.deopt} deoptimized</Badge>
        {summary.ic > 0 && <Badge colorPalette="blue">{summary.ic} IC</Badge>}
        {summary.deoptedFns.length > 0 && (
          <Text fontSize="xs" color="ink.2">
            deopted: {summary.deoptedFns.join(", ")}
          </Text>
        )}
      </HStack>

      <VStack align="stretch" gap={1}>
        {events.map((e, i) => {
          const style = KIND_STYLE[e.kind];
          return (
            <Flex
              // eslint-disable-next-line react/no-array-index-key -- trace events are a sequence: two identical deopts of the same function are distinct events, told apart only by position.
              key={i}
              gap={3}
              align="baseline"
              px={3}
              py={2}
              borderRadius="md"
              borderLeft="3px solid"
              borderColor={style.color}
              bg="surface.hover"
            >
              <Text
                fontFamily="mono"
                fontSize="10px"
                fontWeight="700"
                color={style.color}
                minW={12}
              >
                {style.label}
                {e.bailout ? `·${e.bailout}` : ""}
              </Text>
              <Box flex="1" minW={0}>
                <Flex gap={2} align="baseline" wrap="wrap">
                  {e.fn && (
                    <Text textStyle="codeXl" color="ink.1">
                      {e.fn}
                    </Text>
                  )}
                  {e.location && (
                    <Text textStyle="code" color="ink.label">
                      {e.location}
                    </Text>
                  )}
                </Flex>
                {e.reason && (
                  <Text fontSize="xs" color={e.kind === "deopt" ? "status.error" : "ink.2"}>
                    {e.reason}
                  </Text>
                )}
                <EventAnnotations raw={e.raw} annotations={eventAnnotations[i]} />
              </Box>
            </Flex>
          );
        })}
      </VStack>
    </VStack>
  );
};

export default DeoptView;
