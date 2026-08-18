import { Span } from "@chakra-ui/react";

import { looping } from "./TraceSteps";
import { tabName } from "./traceCycle";

export function TraceTab({ label, index, totalMs }: { label: string; index: number; totalMs: number }) {
  return (
    <Span
      data-tab={index}
      textStyle="code"
      color="ink.label"
      borderBottomWidth="1px"
      borderBottomColor="transparent"
      pt="2px"
      pb="3px"
      {...looping(tabName(index), totalMs)}
    >
      {label}
    </Span>
  );
}
