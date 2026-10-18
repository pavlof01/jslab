"use client";

import { Box } from "@chakra-ui/react";
import { useState } from "react";

import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import type { EngineKey } from "@/lib/types";

import * as styles from "./playground.styles";

type Props = {
  engine: EngineKey;
  prelude?: string;
  previousPrelude?: string;
  showDiff: boolean;
};

const PreludeSection: React.FC<Props> = ({ engine, prelude, previousPrelude, showDiff }) => {
  const [open, setOpen] = useState(false);
  if (!prelude) return null;

  const lines = prelude.split("\n").length;

  return (
    <>
      <Box
        as="button"
        css={styles.preludeToggle}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        <span>sandbox prelude</span>
        <Box as="span" css={styles.preludeMeta}>
          {lines} line{lines === 1 ? "" : "s"} · {open ? "shown" : "hidden"}
        </Box>
      </Box>
      {open ? (
        <HighlightedCode
          engineKey={engine}
          out={prelude}
          prev={previousPrelude}
          showDiff={showDiff}
          emptyState={null}
        />
      ) : null}
    </>
  );
};

export default PreludeSection;
