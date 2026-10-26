import { Box, Flex, Link, Text } from "@chakra-ui/react";

import SnapshotHeader from "@/components/Snapshot/SnapshotHeader";
import SnapshotOutput from "@/components/Snapshot/SnapshotOutput";
import type { EmbedSnapshot } from "@/lib/embedState";

type Props = { snapshot: EmbedSnapshot | null };

const EmbedBytecodeView: React.FC<Props> = ({ snapshot }) => {
  if (!snapshot) {
    return (
      <Flex height="100dvh" align="center" justify="center" bg="surface.band" px={4}>
        <Text fontSize="xs" color="ink.2" textAlign="center">
          This embed has no readable snapshot.{" "}
          <Link href="/playground" target="_blank" rel="noopener noreferrer" color="accent">
            Open JSLab
          </Link>
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" height="100dvh" bg="surface.band">
      <SnapshotHeader snapshot={snapshot} />
      <Box flex="1" minH={0} overflow="auto" p={{ base: 2, sm: 3 }}>
        <SnapshotOutput snapshot={snapshot} />
      </Box>
    </Flex>
  );
};

export default EmbedBytecodeView;
