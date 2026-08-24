import { Button } from "@chakra-ui/react";

export function RuleTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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
}
