import { Box, Heading, Link, Text } from "@chakra-ui/react";
import NextLink from "next/link";

import type { Block } from "@/lib/articles/blocks";
import { LIST_COPY } from "@/lib/articles/metadata";
import { type Article, LIST_PATH } from "@/lib/articles/types";

import MarkdownBlocks from "./MarkdownBlocks";

type Props = { article: Article; blocks: Block[] };

const ArticleView: React.FC<Props> = ({ article, blocks }) => (
  <Box as="main" maxW="760px" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 8, md: 12 }}>
    <Box mb={6}>
      <Link asChild fontSize="sm">
        <NextLink href={LIST_PATH}>{LIST_COPY.title}</NextLink>
      </Link>
    </Box>
    <Box as="article">
      <Heading
        as="h1"
        textStyle="display"
        fontSize={{ base: "3xl", md: "4xl" }}
        color="ink.1"
        mb={4}
      >
        {article.title}
      </Heading>
      <Text textStyle="body" fontSize="lg" color="ink.2" mb={8}>
        {article.description}
      </Text>
      <MarkdownBlocks blocks={blocks} />
    </Box>
  </Box>
);

export default ArticleView;
