import { Box, type BoxProps, Flex, Grid, Span } from "@chakra-ui/react";

export type StepRowState = "pending" | "current" | "done";

export type StepTest = {
  taken: boolean;
  clause: string;
  label: string;
  state: StepRowState;
};

export type StepNodeProps = {
  op: string;
  args: React.ReactNode;
  specId?: string;
  result?: string;
  depth?: number;
  active?: boolean;
  pending?: boolean;
  tests?: StepTest[];
  action?: React.ReactNode;
  actionState?: StepRowState;
  onClick?: () => void;
  onSelectTest?: (testIndex: number) => void;
} & Omit<BoxProps, "children">;

function frameBackground({ active, nested }: { active: boolean; nested: boolean }): string {
  if (active) return "surface.accentSoft";
  if (nested) return "surface.band";
  return "surface.panel";
}

function rowStyles(state: StepRowState) {
  return {
    opacity: state === "pending" ? "pending" : 1,
    bg: state === "current" ? "surface.accentRow" : "transparent",
    mx: "-8px",
    px: "8px",
    py: "2px",
    transitionProperty: "opacity, background",
    transitionDuration: "reveal",
    transitionTimingFunction: "DEFAULT",
  } as const;
}

const StepNode: React.FC<StepNodeProps> = ({
  op,
  args,
  specId,
  result,
  depth = 0,
  active = false,
  pending = false,
  tests = [],
  action,
  actionState = "done",
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
        <FrameHeader op={op} args={args} specId={specId} result={result} active={active} />

        <Grid px="14px" pt="9px" pb="11px" gap="5px">
          {tests.map((test, index) => (
            <TestRow
              key={`${test.clause}-${test.label}`}
              test={test}
              onSelect={onSelectTest ? () => onSelectTest(index) : undefined}
            />
          ))}

          {action ? <ActionRow state={actionState}>{action}</ActionRow> : null}
        </Grid>
      </Box>
    </Box>
  );
};

const ParentElbow: React.FC = () => {
  return (
    <Box
      aria-hidden="true"
      position="absolute"
      left={0}
      top="23px"
      w="19px"
      h="1px"
      bg="rule.panel"
    />
  );
};

type FrameHeaderProps = {
  op: string;
  args: React.ReactNode;
  specId?: string;
  result?: string;
  active: boolean;
};

const FrameHeader: React.FC<FrameHeaderProps> = ({ op, args, specId, result, active }) => {
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
          <Span textStyle="code" color="accent">
            ⟶ {result}
          </Span>
        ) : null}
      </Flex>
    </Flex>
  );
};

type TestRowProps = { test: StepTest; onSelect?: () => void };

const TestRow: React.FC<TestRowProps> = ({ test, onSelect }) => {
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

type ActionRowProps = { state: StepRowState; children: React.ReactNode };

const ActionRow: React.FC<ActionRowProps> = ({ state, children }) => {
  return (
    <Grid
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

export default StepNode;
