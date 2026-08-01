"use client";

import { useCallback, useState } from "react";
import {
  Box,
  Button,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerPositioner,
  DrawerRoot,
  Flex,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuHistory, LuX } from "react-icons/lu";

import { ENGINE_KEYS, EngineKey } from "@/lib/types";
import { useEngineOutputsActions } from "@/store/useEngineOutputs";
import { clearHistory, loadHistory, type RunHistoryEntry } from "@/lib/runHistory";

function relativeTime(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function RunHistory() {
  const { setCode, setEngines, setSelectedV8Flags } = useEngineOutputsActions();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<RunHistoryEntry[]>([]);
  const [now, setNow] = useState(0);

  const refresh = useCallback(() => {
    setEntries(loadHistory());
    setNow(Date.now());
  }, []);

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (next) refresh();
      setOpen(next);
    },
    [refresh],
  );

  const restore = useCallback(
    (e: RunHistoryEntry) => {
      setCode(e.code);
      const selection = ENGINE_KEYS.reduce(
        (acc, k) => ({ ...acc, [k]: e.engines.includes(k) }),
        {} as Record<EngineKey, boolean>,
      );
      setEngines(selection);
      setSelectedV8Flags(e.v8Flags);
      setOpen(false);
    },
    [setCode, setEngines, setSelectedV8Flags],
  );

  const onClear = useCallback(() => {
    clearHistory();
    setEntries([]);
  }, []);

  return (
    <DrawerRoot open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="end" size="sm">
      <Button size="sm" variant="surface" colorPalette="white" onClick={() => onOpenChange(true)} aria-label="Run history">
        <LuHistory /> History
      </Button>
      <DrawerBackdrop />
      <DrawerPositioner>
        <DrawerContent>
          <DrawerHeader display="flex" justifyContent="space-between" alignItems="center">
            <Text fontWeight="700">Run history</Text>
            <Flex gap={2} align="center">
              {entries.length > 0 && (
                <Button size="xs" variant="ghost" onClick={onClear}>
                  Clear
                </Button>
              )}
              <DrawerCloseTrigger asChild>
                <IconButton aria-label="Close history" size="sm" variant="ghost">
                  <LuX />
                </IconButton>
              </DrawerCloseTrigger>
            </Flex>
          </DrawerHeader>
          <DrawerBody>
            {entries.length === 0 ? (
              <Text color="whiteAlpha.500" fontSize="sm">
                No runs yet. Runs you execute in the playground are saved here.
              </Text>
            ) : (
              <VStack align="stretch" gap={2}>
                {entries.map((e) => (
                  <Box
                    key={e.id}
                    as="button"
                    textAlign="left"
                    role="button"
                    tabIndex={0}
                    onClick={() => restore(e)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        restore(e);
                      }
                    }}
                    p={3}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    _hover={{ borderColor: "brand.500", bg: "whiteAlpha.50" }}
                  >
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="xs" color="brand.300">
                        {e.engines.join(", ")}
                        {e.v8Flags.length > 0 ? ` · ${e.v8Flags.length} flag${e.v8Flags.length > 1 ? "s" : ""}` : ""}
                      </Text>
                      <Text fontSize="xs" color="whiteAlpha.500">
                        {relativeTime(e.ts, now)}
                      </Text>
                    </Flex>
                    <Text
                      fontFamily="mono"
                      fontSize="xs"
                      color="whiteAlpha.800"
                      lineClamp={2}
                      whiteSpace="pre-wrap"
                      wordBreak="break-all"
                    >
                      {e.code.slice(0, 160) || "(empty)"}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </DrawerPositioner>
    </DrawerRoot>
  );
}
