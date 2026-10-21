import { Box, Flex } from "@chakra-ui/react";

import SnapshotHeader from "@/components/Snapshot/SnapshotHeader";
import SnapshotOutput from "@/components/Snapshot/SnapshotOutput";
import type { EmbedSnapshot } from "@/lib/embedState";

type Props = { snapshot: EmbedSnapshot };

const ArticleSnapshot: React.FC<Props> = ({ snapshot }) => (
  <Flex
    as="figure"
    direction="column"
    layerStyle="panel"
    bg="surface.band"
    maxH="480px"
    aria-label={`${snapshot.engine} output`}
  >
    <SnapshotHeader snapshot={snapshot} />
    <Box flex="1" minH={0} overflow="auto" p={{ base: 2, sm: 3 }}>
      <SnapshotOutput snapshot={snapshot} />
    </Box>
  </Flex>
);

export default ArticleSnapshot;
