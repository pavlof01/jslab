import { Box, Container, Grid } from "@chakra-ui/react";

import { TOOL_ROWS } from "../landing-data";
import { IndexRow, SectionHead } from "./SectionHead";

export function ToolsSection() {
  return (
    <Box layerStyle="section" as="section" id="tools" scrollMarginTop="64px">
      <Container maxW="1280px" px={{ base: 4, md: "clamp(16px, 4vw, 56px)" }}>
        <SectionHead
          number="04"
          label="tools"
          heading="Six tools. Three read the engines, three run the spec."
        />

        <Grid
          templateColumns="repeat(auto-fit, minmax(min(100%, 360px), 1fr))"
          columnGap={{ base: 6, md: "clamp(24px, 4vw, 64px)" }}
          borderBottomWidth="1px"
          borderColor="rule.list"
          mb={{ base: 10, md: "96px" }}
        >
          {TOOL_ROWS.map((tool) => (
            <IndexRow
              key={tool.href}
              n={tool.n}
              href={tool.href}
              name={tool.name}
              kind={tool.kind}
              desc={tool.desc}
              nameSize="19px"
            />
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
