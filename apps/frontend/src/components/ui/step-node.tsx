import { Box, Grid } from "@chakra-ui/react";

import ActionRow from "./step-action-row";
import FrameHeader from "./step-frame-header";
import { frameBackground } from "./step-node.styles";
import type { StepNodeProps } from "./step-node.types";
import ParentElbow from "./step-parent-elbow";
import TestRow from "./step-test-row";

export type { StepNodeProps, StepRowState, StepTest } from "./step-node.types";

const StepNode: React.FC<StepNodeProps> = ({
  op,
  args,
  specId,
  result,
  resultRevealed = true,
  depth = 0,
  active = false,
  pending = false,
  tests = [],
  action,
  actionState = "done",
  actionIndex,
  onClick,
  onSelectTest,
  ...rest
}) => {
  const nested = depth > 0;

  return (
    <Box
      position="relative"
      ml={`${depth * 30}px`}
      pl={nested ? "20px" : 0}
      borderLeftWidth={nested ? "1px" : 0}
      borderColor="rule.structural"
      opacity={pending ? "pending" : 1}
      transitionProperty="opacity"
      transitionDuration="reveal"
      transitionTimingFunction="DEFAULT"
      {...rest}
    >
      {nested ? <ParentElbow /> : null}

      <Box
        onClick={onClick}
        borderWidth="1px"
        borderColor={active ? "rule.accent" : "rule.structural"}
        bg={frameBackground({ active, nested })}
        mb="12px"
        cursor={onClick ? "pointer" : "default"}
      >
        <FrameHeader
          op={op}
          args={args}
          specId={specId}
          result={result}
          resultRevealed={resultRevealed}
          active={active}
        />

        <Grid px="14px" pt="9px" pb="11px" gap="5px">
          {tests.map((test, index) => (
            <TestRow
              key={`${test.clause}-${test.label}`}
              test={test}
              onSelect={onSelectTest ? () => onSelectTest(index) : undefined}
            />
          ))}

          {action ? (
            <ActionRow state={actionState} index={actionIndex}>
              {action}
            </ActionRow>
          ) : null}
        </Grid>
      </Box>
    </Box>
  );
};

export default StepNode;
