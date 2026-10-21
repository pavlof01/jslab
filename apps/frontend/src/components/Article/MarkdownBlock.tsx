import { Box, Heading, Text } from "@chakra-ui/react";

import type { Block } from "@/lib/articles/blocks";

import ArticleEditor from "./ArticleEditor";
import ArticleSnapshot from "./ArticleSnapshot";
import MarkdownBlocks from "./MarkdownBlocks";
import MarkdownCode from "./MarkdownCode";
import MarkdownInline from "./MarkdownInline";
import MarkdownList from "./MarkdownList";
import MarkdownTable from "./MarkdownTable";

type Props = { block: Block };

const MarkdownBlock: React.FC<Props> = ({ block }) => {
  switch (block.kind) {
    case "heading":
      return (
        <Heading
          as={block.depth <= 2 ? "h2" : "h3"}
          textStyle="title"
          fontSize={block.depth <= 2 ? "2xl" : "lg"}
          color="ink.1"
          mt={6}
        >
          <MarkdownInline nodes={block.children} />
        </Heading>
      );
    case "paragraph":
      return (
        <Text textStyle="body" color="ink.2">
          <MarkdownInline nodes={block.children} />
        </Text>
      );
    case "list":
      return (
        <Box textStyle="body" color="ink.2">
          <MarkdownList ordered={block.ordered} start={block.start} items={block.items} />
        </Box>
      );
    case "table":
      return <MarkdownTable header={block.header} rows={block.rows} />;
    case "quote":
      return (
        <Box as="blockquote" borderLeft="2px solid" borderColor="accent" ps={4}>
          <MarkdownBlocks blocks={block.blocks} />
        </Box>
      );
    case "code":
      return <MarkdownCode text={block.text} lines={block.lines} />;
    case "rule":
      return <Box as="hr" borderColor="rule.structural" />;
    case "snapshot":
      return <ArticleSnapshot snapshot={block.snapshot} />;
    case "editor":
      return <ArticleEditor state={block.state} />;
  }
};

export default MarkdownBlock;
