import { Button } from "@chakra-ui/react";

type Props = {
  label: string;
  active: boolean;
  onClick: () => void;
};

const RuleTab: React.FC<Props> = ({ label, active, onClick }) => {
  return (
    <Button
      variant="rule"
      typeface="prose"
      onClick={onClick}
      aria-pressed={active}
      borderColor={active ? "accent" : "transparent"}
      pt="2px"
      pb="3px"
      textStyle="code"
      color={active ? "accent" : "ink.label"}
      _hover={{ color: active ? "accent" : "ink.1" }}
    >
      {label}
    </Button>
  );
};

export default RuleTab;
