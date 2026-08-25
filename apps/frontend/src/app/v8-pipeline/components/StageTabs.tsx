"use client";

import { Box, Flex, Status, Tabs, Text, VStack } from "@chakra-ui/react";
import { Fragment } from "react";
import { FaLongArrowAltRight } from "react-icons/fa";

import { LogoLoader } from "@/components/ui";

import { STAGES } from "../lib/stages";
import type { StageStatus } from "../lib/usePipelineRun";

const STATUS_COLOR: Partial<Record<StageStatus, string>> = {
  ok: "status.ok",
  error: "status.error",
};

type Props = {
  statusOf: (id: (typeof STAGES)[number]["id"]) => StageStatus;
};

const StageTabs: React.FC<Props> = ({ statusOf }) => {
  return (
    <Box
      borderBottom="1px solid rgba(255,255,255,0.06)"
      px={4}
      py={3}
      flexShrink={0}
      overflowX="auto"
    >
      <Tabs.List bg="surface.band" rounded="2xl" p={1} gap={0} minW="max-content">
        {STAGES.map((stage, index) => (
          <Fragment key={stage.id}>
            <Tabs.Trigger value={stage.id} _selected={{ color: "accent" }} h="auto" px={3}>
              <VStack>
                <StageIndicator status={statusOf(stage.id)} />
                <Text fontSize="sm" fontWeight="700">
                  {stage.label}
                </Text>
                <Text fontSize="10px" color="ink.6">
                  {stage.tier}
                </Text>
              </VStack>
            </Tabs.Trigger>
            {index < STAGES.length - 1 ? <StageArrow /> : null}
          </Fragment>
        ))}
        <Tabs.Indicator
          bg="surface.accentSoft"
          borderWidth="1px"
          borderColor="rule.accent"
          rounded="lg"
        />
      </Tabs.List>
    </Box>
  );
};

type StageIndicatorProps = { status: StageStatus };

const StageIndicator: React.FC<StageIndicatorProps> = ({ status }) => {
  const color = STATUS_COLOR[status];

  return (
    <Status.Root>
      {status === "loading" ? <LogoLoader size={14} /> : null}
      {color ? <Status.Indicator bg={color} /> : null}
    </Status.Root>
  );
};

const StageArrow: React.FC = () => {
  return (
    <Flex align="center" px={2} aria-hidden="true">
      <FaLongArrowAltRight />
    </Flex>
  );
};

export default StageTabs;
