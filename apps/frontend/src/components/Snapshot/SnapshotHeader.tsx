import { Flex, Link, Text } from "@chakra-ui/react";
import { LuExternalLink } from "react-icons/lu";

import type { EmbedSnapshot } from "@/lib/embedState";
import { engineLabel } from "@/lib/engines";
import { buildShareUrl } from "@/lib/shareState";

type Props = { snapshot: EmbedSnapshot };

const SnapshotHeader: React.FC<Props> = ({ snapshot }) => {
  const openHref = buildShareUrl("", "/playground", {
    code: snapshot.code,
    engines: [snapshot.engine],
    flags: { [snapshot.engine]: snapshot.flags },
  });

  return (
    <Flex
      h={9}
      px={{ base: 2, sm: 3 }}
      align="center"
      justify="space-between"
      borderBottom="1px solid"
      borderColor="rule.structural"
      flexShrink={0}
      gap={2}
    >
      <Flex align="center" gap={2} minW={0} flex="1">
        <Text fontSize="xs" fontWeight="700" color="ink.2" letterSpacing="0.04em" flexShrink={0}>
          {engineLabel(snapshot.engine)}
        </Text>
        {snapshot.title && (
          <Text fontSize="xs" color="ink.label" truncate minW={0}>
            {snapshot.title}
          </Text>
        )}
      </Flex>
      <Link
        href={openHref}
        target="_blank"
        rel="noopener noreferrer"
        fontSize="xs"
        color="accent"
        display="inline-flex"
        alignItems="center"
        gap={1}
        flexShrink={0}
        whiteSpace="nowrap"
        aria-label="Open this snippet in JSLab"
      >
        <Text as="span" hideBelow="sm">
          Open in JSLab
        </Text>
        <LuExternalLink />
      </Link>
    </Flex>
  );
};

export default SnapshotHeader;
