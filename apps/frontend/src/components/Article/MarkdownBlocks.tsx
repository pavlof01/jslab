import { Flex } from "@chakra-ui/react";

import type { Block } from "@/lib/articles/blocks";

import MarkdownBlock from "./MarkdownBlock";

type Props = { blocks: Block[]; tight?: boolean };

const MarkdownBlocks: React.FC<Props> = ({ blocks, tight = false }) => (
  <Flex direction="column" gap={tight ? 2 : 5}>
    {blocks.map((block) => (
      <MarkdownBlock key={block.key} block={block} />
    ))}
  </Flex>
);

export default MarkdownBlocks;
