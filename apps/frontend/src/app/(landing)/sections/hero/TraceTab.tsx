import { Span } from "@chakra-ui/react";

import { tabName } from "./traceCycle";
import { looping } from "./TraceSteps";

type Props = {
  label: string;
  index: number;
  totalMs: number;
};

const TraceTab: React.FC<Props> = ({ label, index, totalMs }) => {
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
};

export default TraceTab;
