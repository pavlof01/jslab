"use client";

import { Box } from "@chakra-ui/react";

import { useRunStatus } from "@/store/engineOutputsSelectors";

import { messageLine } from "./playground.styles";

const RunMessage: React.FC = () => {
  const { error, notice } = useRunStatus();

  if (error) return <Box css={messageLine("error")}>{error}</Box>;
  if (notice) return <Box css={messageLine("notice")}>{notice}</Box>;
  return null;
};

export default RunMessage;
