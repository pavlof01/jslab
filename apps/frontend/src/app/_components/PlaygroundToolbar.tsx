import { Box } from "@chakra-ui/react";

import V8Intrinsics from "@/components/V8Intrinsics";

import DiffToggleButton from "./DiffToggleButton";
import EngineFlagPickers from "./EngineFlagPickers";
import EngineToggles from "./EngineToggles";
import * as styles from "./playground.styles";
import PlaygroundSamples from "./PlaygroundSamples";
import RunButton from "./RunButton";
import RunHistory from "./RunHistory";
import ShareButton from "./ShareButton";

const PlaygroundToolbar: React.FC = () => {
  return (
    <Box css={styles.toolbar}>
      <Box css={styles.toolbarEngines}>
        <EngineToggles />
        <EngineFlagPickers />
        <V8Intrinsics />
      </Box>

      <Box css={styles.toolbarActions}>
        <PlaygroundSamples />
        <RunHistory />
        <ShareButton />
        <DiffToggleButton />
        <RunButton />
      </Box>
    </Box>
  );
};

export default PlaygroundToolbar;
