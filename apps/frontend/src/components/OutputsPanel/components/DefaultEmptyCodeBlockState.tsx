import React from "react";
import { EmptyState, VStack } from "@chakra-ui/react";
import { TbCodeDots } from "react-icons/tb";

export type Props = {
  title?: string;
  description?: string;
};

const DefaultEmptyCodeBlockState: React.FC<Props> = ({
  title = "No output yet",
  description = "Run an engine to generate bytecode or smth else",
}) => {
  return (
    <EmptyState.Root>
      <EmptyState.Content>
        <EmptyState.Indicator>
          <TbCodeDots />
        </EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title>{title}</EmptyState.Title>
          <EmptyState.Description>{description}</EmptyState.Description>
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  );
};

export default DefaultEmptyCodeBlockState;
