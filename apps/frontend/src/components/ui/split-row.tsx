"use client";

import { Splitter, type SplitterRootProps, useBreakpointValue } from "@chakra-ui/react";
import { useCallback } from "react";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { withinOr } from "@/lib/numbers";

export type SplitRowProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  storageKey?: string;
  defaultPercent?: number;
  minLeftPercent?: number;
  minRightPercent?: number;
} & Omit<SplitterRootProps, "panels" | "size" | "defaultSize" | "children" | "orientation">;

const UNKEYED = "jsl-split-unkeyed";

const SplitRow: React.FC<SplitRowProps> = ({
  left,
  right,
  storageKey,
  defaultPercent = 30,
  minLeftPercent = 15,
  minRightPercent = 25,
  ...rest
}) => {
  const [stored, setStored] = useLocalStorage<number>(storageKey ?? UNKEYED, defaultPercent);
  const percent = withinOr(stored, { min: 0, max: 100, fallback: defaultPercent });

  const stacked = useBreakpointValue({ base: true, md: false }) ?? false;

  const remember = useCallback(
    (size: number[]) => {
      if (storageKey && size[0] != null) setStored(Math.round(size[0] * 100) / 100);
    },
    [setStored, storageKey],
  );

  return (
    <Splitter.Root
      orientation={stacked ? "vertical" : "horizontal"}
      panels={[
        { id: "left", minSize: minLeftPercent },
        { id: "right", minSize: minRightPercent },
      ]}
      defaultSize={[percent, 100 - percent]}
      onResizeEnd={(details) => remember(details.size)}
      {...rest}
    >
      <Splitter.Panel id="left">{left}</Splitter.Panel>
      <Splitter.ResizeTrigger id="left:right" aria-label="Resize panes" />
      <Splitter.Panel id="right">{right}</Splitter.Panel>
    </Splitter.Root>
  );
};

export default SplitRow;
