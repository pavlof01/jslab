import { Box } from "@chakra-ui/react";

import { useEngineVersion } from "@/components/EngineVersion/context";
import { engineLabel } from "@/lib/engines";
import type { EngineKey } from "@/lib/types";

import * as styles from "./playground.styles";

type Props = {
  engine: EngineKey;
  durationMs?: number;
  flagCount: number;
  summary: string;
};

const OutputPaneFooter: React.FC<Props> = ({ engine, durationMs, flagCount, summary }) => {
  const version = useEngineVersion(engine);

  return (
    <Box css={styles.outputFooter}>
      {version ? (
        <span>
          {engineLabel(engine)} {version}
        </span>
      ) : null}
      <span>{durationMs ? `${durationMs} ms` : "—"}</span>
      {flagCount > 0 ? (
        <span>
          {flagCount} flag{flagCount === 1 ? "" : "s"}
        </span>
      ) : null}
      <span>{summary}</span>
    </Box>
  );
};

export default OutputPaneFooter;
