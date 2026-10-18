import { Flex, Span } from "@chakra-ui/react";

type Props = {
  op: string;
  args: React.ReactNode;
  specId?: string;
  result?: string;
  resultRevealed: boolean;
  active: boolean;
};

const FrameHeader: React.FC<Props> = ({ op, args, specId, result, resultRevealed, active }) => {
  return (
    <Flex
      wrap="wrap"
      align="baseline"
      justify="space-between"
      gap="6px 16px"
      px="14px"
      py="10px"
      borderBottomWidth="1px"
      borderColor="rule.hairline"
    >
      <Flex wrap="wrap" align="baseline" gap="2px 8px" minW={0}>
        <Span textStyle="codeLg" color={active ? "accent" : "ink.1"} overflowWrap="anywhere">
          {op}
        </Span>
        <Span textStyle="code" color="ink.3" overflowWrap="anywhere">
          ( {args} )
        </Span>
      </Flex>

      <Flex align="baseline" gap="10px">
        {specId ? (
          <Span textStyle="label" color="ink.6">
            {specId}
          </Span>
        ) : null}
        {result ? (
          <Span
            textStyle="code"
            color="accent"
            aria-hidden={!resultRevealed}
            opacity={resultRevealed ? 1 : 0}
            transitionProperty="opacity"
            transitionDuration="reveal"
            transitionTimingFunction="DEFAULT"
          >
            ⟶ {result}
          </Span>
        ) : null}
      </Flex>
    </Flex>
  );
};

export default FrameHeader;
