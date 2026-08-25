"use client";

import { Box, Flex, Link, Text } from "@chakra-ui/react";
import { LuExternalLink } from "react-icons/lu";

import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import type { EmbedSnapshot } from "@/lib/embedState";
import { engineLabel } from "@/lib/engines";
import { buildShareUrl } from "@/lib/shareState";

type PlainDumpProps = { text: string };

const PlainDump: React.FC<PlainDumpProps> = ({ text }) => {
  return (
    <Box
      textStyle="code"
      as="pre"
      lineHeight="1.55"
      color="ink.1"
      whiteSpace="pre"
      overflowX="auto"
      m={0}
    >
      {text}
    </Box>
  );
};

type EmbedBytecodeClientProps = { snapshot: EmbedSnapshot | null };

const EmbedBytecodeClient: React.FC<EmbedBytecodeClientProps> = ({ snapshot }) => {
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

  const openHref = buildShareUrl("", "/playground", {
    code: snapshot.code,
    engines: [snapshot.engine],
    flags: { [snapshot.engine]: snapshot.flags },
  });

  return (
    <Flex direction="column" height="100dvh" bg="surface.band">
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

      <Box flex="1" minH={0} overflow="auto" p={{ base: 2, sm: 3 }}>
        <HighlightedCode
          engineKey={snapshot.engine}
          out={snapshot.output}
          showDiff={false}
          EmptyCodeBlockState={() => <PlainDump text={snapshot.output} />}
        />
        {snapshot.stderr && (
          <Box mt={3}>
            <HighlightedCode
              engineKey={snapshot.engine}
              out={snapshot.stderr}
              showDiff={false}
              EmptyCodeBlockState={() => <PlainDump text={snapshot.stderr ?? ""} />}
            />
          </Box>
        )}
      </Box>
    </Flex>
  );
};

export default EmbedBytecodeClient;
