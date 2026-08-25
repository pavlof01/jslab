import { Box, Container, Grid, Text } from "@chakra-ui/react";

import { ALSO } from "../landing-data";
import SectionHead from "./SectionHead";

function withFlag(text: string) {
  const parts = text.split("--prof");
  if (parts.length === 1) return text;
  return (
    <>
      {parts[0]}
      <Text as="span" textStyle="codeInline" color="ink.1">
        --prof
      </Text>
      {parts[1]}
    </>
  );
}

const AlsoSection: React.FC = () => {
  return (
    <Box layerStyle="section" as="section" id="also" scrollMarginTop="64px">
      <Container maxW="1280px" px={{ base: 4, md: "clamp(16px, 4vw, 56px)" }}>
        <SectionHead number="05" label="also true" heading="The rest of it, briefly." />

        <Grid
          templateColumns="repeat(auto-fit, minmax(min(100%, 270px), 1fr))"
          gap={{ base: 0, md: "0 clamp(24px, 4vw, 64px)" }}
          borderBottomWidth="1px"
          borderColor="rule.list"
          mb={{ base: 10, md: "96px" }}
        >
          {ALSO.map(([label, text]) => (
            <Box key={label} py="20px" borderTopWidth="1px" borderColor="rule.list">
              <Text textStyle="label" color="accent" mb="9px">
                {label}
              </Text>
              <Text textStyle="body" color="ink.2" maxW="40ch" textWrap="pretty">
                {withFlag(text)}
              </Text>
            </Box>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default AlsoSection;
