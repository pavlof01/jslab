import { Box, Container, Flex, Grid, Text } from "@chakra-ui/react";

import { QuietLink } from "@/components/ui";

import { STUDIES, studyHref } from "../landing-data";
import SectionHead, { IndexRow } from "./SectionHead";

const StudiesSection: React.FC = () => {
  return (
    <Box layerStyle="section" as="section" id="studies" scrollMarginTop="64px">
      <Container maxW="1280px" px={{ base: 4, md: "clamp(16px, 4vw, 56px)" }}>
        <SectionHead
          number="03"
          label="studies"
          heading="Twelve studies come written. Each one makes V8 print its own answer, then says what the answer meant."
          lede="One idea per file: element kinds, hidden classes, inline caches, deopts. Open any of them in the Playground and edit from there."
        />

        <Grid
          templateColumns="repeat(auto-fit, minmax(min(100%, 340px), 1fr))"
          columnGap={{ base: 6, md: "clamp(24px, 4vw, 64px)" }}
          borderBottomWidth="1px"
          borderColor="rule.list"
        >
          {STUDIES.map((study, i) => (
            <IndexRow
              key={study.key}
              n={String(i + 1).padStart(2, "0")}
              href={studyHref(study.key)}
              name={study.title}
              kind={study.group}
              desc={study.desc}
            />
          ))}
        </Grid>

        <Flex
          textStyle="label"
          wrap="wrap"
          align="baseline"
          justify="space-between"
          gap="10px 20px"
          pt="16px"
          pb={{ base: 10, md: "96px" }}
          color="ink.label"
        >
          <Text>
            {STUDIES.length} files · V8 only ·{" "}
            <Text as="span" textTransform="none" letterSpacing="0.02em" color="ink.2">
              --allow-natives-syntax
            </Text>
          </Text>
          <QuietLink href="/playground">open them in the Playground →</QuietLink>
        </Flex>
      </Container>
    </Box>
  );
};

export default StudiesSection;
