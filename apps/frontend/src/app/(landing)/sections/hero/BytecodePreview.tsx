"use client";

import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { useState } from "react";

import { QuietLink } from "@/components/ui";
import { Band } from "@/components/ui/band";
import Label from "@/components/ui/label";

import { DUMPS, SNIPPET } from "../../landing-data";
import RuleTab from "./RuleTab";

const BytecodePreview: React.FC = () => {
  const [engineIndex, setEngineIndex] = useState(0);
  const [opcode, setOpcode] = useState<string | null>(null);

  const dump = DUMPS[engineIndex];
  const opKey = opcode && dump.ops[opcode] ? opcode : dump.first;
  const [opSignature, opText] = dump.ops[opKey];

  return (
    <Flex layerStyle="panel" direction="column" minW={0}>
      <Band edge="top">
        <Label>playground · bytecode</Label>
        <Flex wrap="wrap" gap={{ base: "10px", md: "16px" }}>
          {DUMPS.map((d, i) => (
            <RuleTab
              key={d.short}
              label={d.short}
              active={i === engineIndex}
              onClick={() => {
                setEngineIndex(i);
                setOpcode(null);
              }}
            />
          ))}
        </Flex>
      </Band>

      <Box
        px={{ base: 4, md: "26px" }}
        pt={{ base: 5, md: "26px" }}
        pb={{ base: 4, md: "18px" }}
        borderColor="rule.row"
      >
        <Text
          as="pre"
          fontFamily="mono"
          fontSize={{ base: "13px", md: "15px" }}
          lineHeight="1.6"
          color="ink.1"
          overflowX="auto"
        >
          {SNIPPET}
        </Text>
      </Box>

      <Box px={{ base: 4, md: "26px" }} py={{ base: 4, md: "22px" }} overflowX="auto">
        {dump.lines.map((parts, li) => {
          const op = parts[1] && dump.ops[parts[1]] ? parts[1] : "";
          const active = Boolean(op) && op === opKey;
          return (
            <Flex
              key={parts.join("\u0000")}
              w="max-content"
              whiteSpace="pre"
              fontFamily="mono"
              fontSize={{ base: "11px", md: "12.5px" }}
              lineHeight="1.8"
              color={li === 0 ? "ink.label" : "ink.3"}
            >
              <Box as="span" flex="0 0 auto">
                {parts[0] ?? ""}
              </Box>
              {op ? (
                <Button
                  variant="rule"
                  typeface="prose"
                  onClick={() => setOpcode(op)}
                  flex="0 0 auto"
                  color={active ? "accent" : "ink.1"}
                  borderStyle={active ? "solid" : "dashed"}
                  borderColor={active ? "accent" : "rule.link"}
                  _hover={{ color: "accent" }}
                >
                  {op}
                </Button>
              ) : null}
              <Box as="span" flex="0 0 auto">
                {parts[2] ?? ""}
              </Box>
            </Flex>
          );
        })}
      </Box>

      <Box px={{ base: 4, md: "26px" }} pb={{ base: 4, md: "22px" }}>
        <Grid gap="8px" pt={{ base: 3.5, md: "18px" }} borderTopWidth="1px" borderColor="rule.row">
          <Text textStyle="code" color="accent">
            {opSignature}
          </Text>
          <Text fontSize="14.5px" lineHeight="1.55" color="ink.2" maxW="44ch" textWrap="pretty">
            {opText}
          </Text>
          <Text textStyle="label" color="ink.5">
            click any opcode · reference covers all four
          </Text>
        </Grid>
      </Box>

      <Box mt="auto">
        <Band edge="bottom">
          <Text textStyle="codeSm" color="ink.label">
            {dump.name} · printed by {dump.flag}
          </Text>
          <QuietLink href="/playground" mono>
            open Playground →
          </QuietLink>
        </Band>
      </Box>
    </Flex>
  );
};

export default BytecodePreview;
