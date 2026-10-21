import { Box, Flex, Heading, Link, Text } from "@chakra-ui/react";
import NextLink from "next/link";

import type { Block } from "@/lib/articles/blocks";
import { LIST_COPY } from "@/lib/articles/metadata";
import { type Article, articlePath, listPath, otherLanguage } from "@/lib/articles/types";

import MarkdownBlocks from "./MarkdownBlocks";

type Props = { article: Article; blocks: Block[] };

const ArticleView: React.FC<Props> = ({ article, blocks }) => {
  const other = otherLanguage(article.language);
  return (
    <Box
      as="main"
      lang={article.language}
      maxW="760px"
      mx="auto"
      px={{ base: 4, md: 6 }}
      py={{ base: 8, md: 12 }}
    >
      <Flex justify="space-between" align="center" gap={4} mb={6}>
        <Link asChild fontSize="sm">
          <NextLink href={listPath(article.language)}>{LIST_COPY[article.language].title}</NextLink>
        </Link>
        <Link asChild fontSize="sm" hrefLang={other}>
          <NextLink href={articlePath(other, article.slug)}>{LIST_COPY[other].name}</NextLink>
        </Link>
      </Flex>
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
};

export default ArticleView;
