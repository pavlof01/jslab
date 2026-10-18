"use client";

import { Button, Flex, Grid, Text } from "@chakra-ui/react";
import { useState } from "react";

import { QuietLink } from "@/components/ui";

import { INTRINSICS } from "../landing-data";

const IntrinsicsExplorer: React.FC = () => {
  const [selected, setSelected] = useState(0);
  const [signature, explanation] = INTRINSICS[selected];

  return (
    <Grid
      templateColumns="repeat(auto-fit, minmax(min(100%, 300px), 1fr))"
      gap="1px"
      bg="rule.structural"
    >
      <Flex direction="column" gap="16px" bg="surface.panel" p={{ base: 5, md: "26px" }}>
        <Flex wrap="wrap" gap="8px 10px">
          {INTRINSICS.map(([name], i) => (
            <Button
              key={name}
              variant="ghost"
              typeface="code"
              active={i === selected}
              onClick={() => setSelected(i)}
              maxW="100%"
              overflowWrap="anywhere"
            >
              {name.replace(/\(.*\)/, "()")}
            </Button>
          ))}
        </Flex>
      </Flex>

      <Flex direction="column" gap="12px" bg="surface.band" p={{ base: 5, md: "26px" }}>
        <Text textStyle="codeLg" color="accent" wordBreak="break-word">
          {signature}
        </Text>
        <Text textStyle="body" color="ink.2" maxW="48ch" textWrap="pretty">
          {explanation}
        </Text>
        <QuietLink href="/playground" mono mt="auto" display="inline-block" fontSize="12.5px">
          open the Playground →
        </QuietLink>
      </Flex>
    </Grid>
  );
};

export default IntrinsicsExplorer;
