import { createShikiAdapter } from "@chakra-ui/react";
import type { HighlighterGeneric } from "shiki";

import { getSourceHighlighter, THEME } from "@/lib/shiki";

export const sourceShikiAdapter = {
  ...createShikiAdapter<HighlighterGeneric<never, never>>({
    load: getSourceHighlighter,
    theme: THEME,
  }),
  unloadContext: () => {},
};
