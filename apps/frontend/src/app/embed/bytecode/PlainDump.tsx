import { Box } from "@chakra-ui/react";

type Props = { text: string };

const PlainDump: React.FC<Props> = ({ text }) => (
  <Box
    textStyle="code"
    as="pre"
    lineHeight="1.55"
    color="ink.1"
    whiteSpace="pre"
    overflowX="auto"
    m={0}
  >
    {text}
  </Box>
);

export default PlainDump;
