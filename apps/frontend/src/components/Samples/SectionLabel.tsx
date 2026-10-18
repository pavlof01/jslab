import { Text } from "@chakra-ui/react";

type Props = { children: React.ReactNode };

const SectionLabel: React.FC<Props> = ({ children }) => {
  return (
    <Text textStyle="labelSm" color="ink.label" mb={2}>
      {children}
    </Text>
  );
};

export default SectionLabel;
