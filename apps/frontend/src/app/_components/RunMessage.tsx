import { messageLine } from "./playground.styles";
import { Box } from "@chakra-ui/react";

export function RunMessage({ error, notice }: { error?: string; notice?: string }) {
  if (error) return <Box css={messageLine("error")}>{error}</Box>;
  if (notice) return <Box css={messageLine("notice")}>{notice}</Box>;
  return null;
}
