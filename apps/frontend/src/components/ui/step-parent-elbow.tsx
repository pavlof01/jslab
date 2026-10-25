import { Box } from "@chakra-ui/react";

const ParentElbow: React.FC = () => {
  return (
    <Box
      aria-hidden="true"
      position="absolute"
      left={0}
      top="23px"
      w="19px"
      h="1px"
      bg="rule.panel"
    />
  );
};

export default ParentElbow;
