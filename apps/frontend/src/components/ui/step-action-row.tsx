import { Grid, Span } from "@chakra-ui/react";

import { rowStyles } from "./step-node.styles";
import type { StepRowState } from "./step-node.types";

type Props = { state: StepRowState; index?: number; children: React.ReactNode };

const ActionRow: React.FC<Props> = ({ state, index, children }) => {
  return (
    <Grid
      data-step-index={index}
      gridTemplateColumns="12px minmax(0,1fr)"
      columnGap="10px"
      alignItems="baseline"
      borderTopWidth="1px"
      borderColor="rule.hairline"
      {...rowStyles(state)}
      mt="3px"
      pt="9px"
      pb="2px"
    >
      <Span textStyle="codeSm" aria-hidden="true" color="accent">
        →
      </Span>
      <Span textStyle="code" lineHeight="1.5" color="ink.code" textWrap="pretty">
        {children}
      </Span>
    </Grid>
  );
};

export default ActionRow;
