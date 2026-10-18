import { Grid, Span } from "@chakra-ui/react";

import { rowStyles } from "./step-node.styles";
import type { StepTest } from "./step-node.types";

type Props = { test: StepTest; onSelect?: () => void };

const TestRow: React.FC<Props> = ({ test, onSelect }) => {
  return (
    <Grid
      onClick={
        onSelect
          ? (event) => {
              event.stopPropagation();
              onSelect();
            }
          : undefined
      }
      data-step-index={test.index}
      gridTemplateColumns={test.clause ? "12px auto minmax(0,1fr)" : "12px minmax(0,1fr)"}
      columnGap="10px"
      alignItems="baseline"
      cursor={onSelect ? "pointer" : undefined}
      {...rowStyles(test.state)}
    >
      <Span textStyle="codeSm" aria-hidden="true" color={test.taken ? "accent" : "ink.6"}>
        {test.taken ? "✓" : "×"}
      </Span>
      {test.clause ? (
        <Span textStyle="codeSm" whiteSpace="nowrap" color="ink.5">
          {test.clause}
        </Span>
      ) : null}
      <Span
        textStyle="code"
        lineHeight="1.5"
        color={test.taken ? "ink.code" : "ink.label"}
        textWrap="pretty"
      >
        {test.label}
      </Span>
    </Grid>
  );
};

export default TestRow;
