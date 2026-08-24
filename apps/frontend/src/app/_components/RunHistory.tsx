"use client";

import {
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
import { useCallback, useState } from "react";
import { LuX } from "react-icons/lu";
import { clearHistory, loadHistory, type RunHistoryEntry } from "@/lib/runHistory";
import { selectionFrom } from "@/lib/types";
import { useStateRestore } from "@/store/engineOutputsSelectors";
import { RunHistoryRow } from "./RunHistoryRow";

export default function RunHistory() {
  const { setCode, setEngines, setFlags } = useStateRestore();
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
    (entry: RunHistoryEntry) => {
      setCode(entry.code);
      setEngines(selectionFrom(entry.engines));
      setFlags(entry.flags);
      setOpen(false);
    },
    [setCode, setEngines, setFlags],
  );

  const onClear = useCallback(() => {
    clearHistory();
    setEntries([]);
  }, []);

  return (
    <DrawerRoot
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="end"
      size="sm"
      lazyMount
      unmountOnExit
    >
      <Button size="sm" onClick={() => onOpenChange(true)} aria-label="Run history">
        history
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
              <Text color="ink.label" fontSize="sm">
                No runs yet. Runs you execute in the playground are saved here.
              </Text>
            ) : (
              <VStack align="stretch" gap={2}>
                {entries.map((entry) => (
                  <RunHistoryRow
                    key={entry.id}
                    entry={entry}
                    now={now}
                    onRestore={() => restore(entry)}
                  />
                ))}
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </DrawerPositioner>
    </DrawerRoot>
  );
}
