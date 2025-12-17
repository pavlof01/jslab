import { EmptyState, VStack } from "@chakra-ui/react";
import React from "react";
import { TbCodeDots } from "react-icons/tb";

const DefaultEmptyCodeBlockState = () => {
  return (
    <EmptyState.Root>
      <EmptyState.Content>
        <EmptyState.Indicator>
          <TbCodeDots />
        </EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title>No output yet</EmptyState.Title>
          <EmptyState.Description>Run an engine to generate bytecode or smth else</EmptyState.Description>
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  );
};

export default DefaultEmptyCodeBlockState;
