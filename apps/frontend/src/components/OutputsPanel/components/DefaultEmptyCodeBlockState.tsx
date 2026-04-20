import React from "react";
import { Button, ButtonGroup, EmptyState, Show, VStack } from "@chakra-ui/react";
import { TbCodeDots } from "react-icons/tb";
import { useEngineOutputsActions } from "@/store/useEngineOutputs";

export type Props = {
  title?: string;
  description?: string;
  buttonText?: string;
  onButtonClick?: () => void;
};

const DefaultEmptyCodeBlockState: React.FC<Props> = ({
  title = "No output yet",
  description = "Run an engine to generate bytecode or smth else",
  buttonText = "Run",
  onButtonClick,
}) => {
  const { runEngines } = useEngineOutputsActions();

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else {
      runEngines();
    }
  };

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
        {/* <Show when={!!onButtonClick || !!runEngines}>
          <ButtonGroup>
            <Button onClick={handleButtonClick}>{buttonText}</Button>
          </ButtonGroup>
        </Show> */}
      </EmptyState.Content>
    </EmptyState.Root>
  );
};

export default DefaultEmptyCodeBlockState;
