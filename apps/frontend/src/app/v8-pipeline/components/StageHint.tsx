import { Box, Text } from "@chakra-ui/react";

type Props = { children: React.ReactNode };

const StageHint: React.FC<Props> = ({ children }) => {
  return (
    <Box bg="surface.accentSoft" py={2} px={4}>
      <Text fontSize="xs" color="ink.2">
        <Text as="span" color="accent" fontWeight="700">
          Tip:{" "}
        </Text>
        {children}
      </Text>
    </Box>
  );
};

export default StageHint;
