import React from "react";
import { Box, Clipboard, Button } from "@chakra-ui/react";

type Props = {
  out: string;
};

const CopyButton: React.FC<Props> = ({ out }) => {
  return (
    <Clipboard.Root value={out} position="absolute" right={0}>
      <Clipboard.Trigger asChild>
        <Button variant="ghost" size="sm">
          <Clipboard.Indicator />
          <Clipboard.CopyText />
        </Button>
      </Clipboard.Trigger>
    </Clipboard.Root>
  );
};

export default CopyButton;
