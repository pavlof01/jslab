import { Span } from "@chakra-ui/react";

type Props = { text: string; color?: string };

const TabMeta: React.FC<Props> = ({ text, color }) => {
  return (
    <Span textStyle="labelSm" color={color ?? "ink.6"}>
      {text}
    </Span>
  );
};

export default TabMeta;
