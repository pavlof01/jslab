"use client";

import { Alert, Box, Text } from "@chakra-ui/react";

import { RunStatus } from "@/lib/types";
import { useEngineOutputsState } from "@/store/useEngineOutputs";

// Off-screen but still read by screen readers; Chakra has no srOnly prop in v3.
const srOnly = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  borderWidth: 0,
} as const;

/**
 * Renders the run outcome the store already tracks: the empty-editor / rate-limit
 * error and the duration. Before this both lived in the store unread, so pressing
 * Run on an empty editor looked like nothing happened at all.
 */
export default function RunStatusBar() {
  const { status, meta, error, notice } = useEngineOutputsState();

  const announcement =
    status === RunStatus.running
      ? "Running…"
      : status === RunStatus.error && error
        ? error
        : status === RunStatus.done
          ? [`Run finished. ${meta || "No output timing available."}`, notice].filter(Boolean).join(" ")
          : "";

  return (
    <>
      <Box css={srOnly} role="status" aria-live="polite">
        {announcement}
      </Box>

      {error && (
        <Alert.Root status="error" size="sm" borderRadius={0} bg="red.950" borderColor="red.800" borderBottomWidth="1px">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description color="red.200" fontSize="xs">
              {error}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {!error && notice && (
        <Alert.Root
          status="warning"
          size="sm"
          borderRadius={0}
          bg="yellow.950"
          borderColor="yellow.800"
          borderBottomWidth="1px"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description color="yellow.200" fontSize="xs">
              {notice}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {!error && meta && (
        <Box px={4} py={1} bg="background.100" borderBottom="1px solid" borderColor="#262626">
          <Text fontSize="xs" color="whiteAlpha.500" fontFamily="mono">
            {meta}
          </Text>
        </Box>
      )}
    </>
  );
}
