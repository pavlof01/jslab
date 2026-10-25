import { Box } from "@chakra-ui/react";

import { SplitRow } from "@/components/ui";

import OutputPane from "./OutputPane";
import * as styles from "./playground.styles";
import PlaygroundEditor from "./PlaygroundEditor";
import PlaygroundToolbar from "./PlaygroundToolbar";
import RunAnnouncer from "./RunAnnouncer";
import RunMessage from "./RunMessage";
import SharedStateRestore from "./SharedStateRestore";

const PlaygroundShell: React.FC = () => {
  return (
    <Box as="main" css={styles.frame}>
      <SharedStateRestore />
      <RunAnnouncer />
      <PlaygroundToolbar />
      <RunMessage />

      <SplitRow
        storageKey="jsl-split-playground"
        defaultPercent={30}
        minLeftPercent={20}
        minRightPercent={30}
        css={styles.splitRow}
        left={<PlaygroundEditor />}
        right={
          <Box css={styles.outputPane}>
            <OutputPane />
          </Box>
        }
      />
    </Box>
  );
};

export default PlaygroundShell;
