import { Text } from "@chakra-ui/react";

import SharedStateRestore from "@/app/_components/SharedStateRestore";

import EmbedPlaygroundFrame from "./EmbedPlaygroundFrame";

const EmbedPlaygroundShell: React.FC = () => (
  <>
    <SharedStateRestore />
    <EmbedPlaygroundFrame
      height="100dvh"
      heading={
        <Text fontSize="xs" fontWeight="700" color="ink.2" letterSpacing="0.04em">
          JSLab
        </Text>
      }
    />
  </>
);

export default EmbedPlaygroundShell;
