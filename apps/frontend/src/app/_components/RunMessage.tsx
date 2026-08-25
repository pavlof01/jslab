import { Box } from "@chakra-ui/react";

import { messageLine } from "./playground.styles";

type Props = { error?: string; notice?: string };

const RunMessage: React.FC<Props> = ({ error, notice }) => {
  if (error) return <Box css={messageLine("error")}>{error}</Box>;
  if (notice) return <Box css={messageLine("notice")}>{notice}</Box>;
  return null;
};

export default RunMessage;
