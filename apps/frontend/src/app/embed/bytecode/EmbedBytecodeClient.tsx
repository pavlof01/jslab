"use client";

import { Box, Flex, Link, Text } from "@chakra-ui/react";
import { LuExternalLink } from "react-icons/lu";

import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import { EngineKey } from "@/lib/types";
import { buildShareUrl } from "@/lib/shareState";
import type { EmbedSnapshot } from "@/lib/embedState";

const ENGINE_LABEL: Record<EngineKey, string> = {
  [EngineKey.v8]: "V8",
  [EngineKey.sm]: "SpiderMonkey",
  [EngineKey.hermes]: "Hermes",
  [EngineKey.jsc]: "JSC",
};

/**
 * The dump as plain text.
 *
 * Doubles as the server-rendered body: `HighlightedCode` tokenizes inside an
 * effect and renders its empty state until that resolves, so without this a
 * crawler — and Embedly is one — would receive a frame with no content at all.
 * Passing it as the empty state means the same markup covers SSR, the moment
 * before hydration, and JS being unavailable, with no extra state to keep in
 * sync and no hydration mismatch.
 */
function PlainDump({ text }: { text: string }) {
  return (
    <Box
      as="pre"
      fontFamily="mono"
      fontSize="xs"
      lineHeight="1.55"
      color="whiteAlpha.900"
      whiteSpace="pre"
      overflowX="auto"
      m={0}
    >
      {text}
    </Box>
  );
}

/**
 * Output-only embed: a frozen bytecode dump with the same opcode popovers and
 * highlighting the playground uses, and no API call at any point.
 *
 * Sized for an article. Embedly — how Medium renders third-party embeds — fixes
 * the iframe height from the oEmbed response and ignores anything the frame
 * says afterwards, so this scrolls internally instead of trying to grow. The
 * layout is exercised down to 280px, Embedly's stated minimum.
 */
export default function EmbedBytecodeClient({ snapshot }: { snapshot: EmbedSnapshot | null }) {
  if (!snapshot) {
    return (
      <Flex height="100dvh" align="center" justify="center" bg="background.100" px={4}>
        <Text fontSize="xs" color="whiteAlpha.600" textAlign="center">
          This embed has no readable snapshot.{" "}
          <Link href="/playground" target="_blank" rel="noopener noreferrer" color="brand.300">
            Open JSLab
          </Link>
        </Text>
      </Flex>
    );
  }

  const openHref = buildShareUrl("", "/playground", {
    code: snapshot.code,
    engines: [snapshot.engine],
    v8Flags: snapshot.flags,
  });

  return (
    <Flex direction="column" height="100dvh" bg="background.100">
      <Flex
        h={9}
        px={{ base: 2, sm: 3 }}
        align="center"
        justify="space-between"
        borderBottom="1px solid"
        borderColor="#262626"
        flexShrink={0}
        gap={2}
      >
        {/*
          Sized by shrinking, not by breakpoints. Embedly requires the embed to
          work from 280px up, and a hidden-below-480px caption still reserves
          layout space long enough to push the link out of the frame. Letting
          the caption truncate instead degrades continuously at every width.
        */}
        <Flex align="center" gap={2} minW={0} flex="1">
          <Text fontSize="xs" fontWeight="700" color="whiteAlpha.600" letterSpacing="0.04em" flexShrink={0}>
            {ENGINE_LABEL[snapshot.engine]}
          </Text>
          {snapshot.title && (
            <Text fontSize="xs" color="whiteAlpha.500" truncate minW={0}>
              {snapshot.title}
            </Text>
          )}
        </Flex>
        <Link
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          fontSize="xs"
          color="brand.300"
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
}
