import { Box, Flex, Heading, Link, Text } from "@chakra-ui/react";
import NextLink from "next/link";

import { LIST_COPY } from "@/lib/articles/metadata";
import {
  type ArticleLanguage,
  type ArticleMeta,
  articlePath,
  listPath,
  otherLanguage,
} from "@/lib/articles/types";

type Props = { language: ArticleLanguage; articles: ArticleMeta[] };

const ArticleList: React.FC<Props> = ({ language, articles }) => {
  const copy = LIST_COPY[language];
  const other = otherLanguage(language);
  return (
    <Box
      as="main"
      lang={language}
      maxW="760px"
      mx="auto"
      px={{ base: 4, md: 6 }}
      py={{ base: 8, md: 12 }}
    >
      <Flex align="baseline" justify="space-between" gap={4} mb={3}>
        <Heading as="h1" textStyle="display" fontSize={{ base: "3xl", md: "4xl" }} color="ink.1">
          {copy.title}
        </Heading>
        <Link asChild fontSize="sm" hrefLang={other}>
          <NextLink href={listPath(other)}>{LIST_COPY[other].name}</NextLink>
        </Link>
      </Flex>
      <Text textStyle="body" color="ink.2" mb={8}>
        {copy.description}
      </Text>
      <Flex as="ol" direction="column" listStyleType="none" gap={0}>
        {articles.map((article) => (
          <Box
            as="li"
            key={article.slug}
            py={5}
            borderTop="1px solid"
            borderColor="rule.structural"
          >
            <Text textStyle="label" color="ink.label" mb={1}>
              {String(article.number).padStart(2, "0")}
            </Text>
            <Link asChild fontSize="lg" fontWeight="600" borderBottomWidth="0">
              <NextLink href={articlePath(language, article.slug)}>{article.title}</NextLink>
            </Link>
            <Text textStyle="bodySm" color="ink.2" mt={2}>
              {article.description}
            </Text>
          </Box>
        ))}
      </Flex>
    </Box>
  );
};

export default ArticleList;
