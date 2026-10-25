import { SimpleGrid } from "@chakra-ui/react";

type Props = { children: React.ReactNode };

const SampleGrid: React.FC<Props> = ({ children }) => {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
      {children}
    </SimpleGrid>
  );
};

export default SampleGrid;
