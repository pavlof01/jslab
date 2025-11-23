import { Tooltip } from "@/components/ui/tooltip";
import { Text } from "@chakra-ui/react";

import { CSSProperties, ReactNode } from "react";
import { ThemedToken } from "shiki";

type Props = {
  token: ThemedToken;
};

const OPCODE_INFO = {
  LdaZero: "Load accumulator with 0",
  LdaUndefined: "Load accumulator with undefined",
  LdaTrue: "Load accumulator with true",
  LdaFalse: "Load accumulator with false",
  LdaSmi: "Load small integer (Smi) into accumulator",
  LdaConstant: "Load constant pool entry into accumulator",
  LdaGlobal: "Load global property into accumulator",
  Ldar: "Load register into accumulator",
  Star0: "Store accumulator into r0",
  Star1: "Store accumulator into r1",
  Star2: "Store accumulator into r2",
  Star3: "Store accumulator into r3",
  Star4: "Store accumulator into r4",
  Star5: "Store accumulator into r5",
  Star6: "Store accumulator into r6",
  Star7: "Store accumulator into r7",
  Mov: "Move value between registers",
  Add: "Add: acc = x + y",
  Dec: "Decrement (feedback slot indexed)",
  GetNamedProperty: "acc = receiver[name]",
  StaInArrayLiteral: "Store into array literal element",
  CallRuntime: "Call V8 runtime function",
  CallProperty0: "Call property with 0 args",
  CallProperty1: "Call property with 1 arg",
  CallUndefinedReceiver1: "Call with undefined receiver, 1 arg",
  CallUndefinedReceiver0: "Call with undefined receiver, 0 args",
  CreateArrayLiteral: "Create array literal",
  CreateArrayFromIterable: "Create array from iterable",
  GetIterator: "Get iterator from value",
  InvokeIntrinsic: "Call V8 intrinsic (internal op)",
  SwitchOnGeneratorState: "Jump based on generator state",
  SuspendGenerator: "Suspend current generator",
  ResumeGenerator: "Resume generator",
  Jump: "Unconditional jump",
  JumpLoop: "Backward jump for loops",
  JumpIfTrue: "Conditional jump if true",
  JumpIfFalse: "Conditional jump if false",
  JumpIfToBooleanTrue: "Jump if ToBoolean(acc) is true",
  JumpIfUndefinedOrNull: "Jump if value is undefined or null",
  TestGreaterThan: "Compare: acc > const?",
  TestReferenceEqual: "Reference equality compare",
  Throw: "Throw exception",
  ReThrow: "Re-throw pending exception",
  Return: "Return from function",
  SetPendingMessage: "Set pending message (exception detail)",
  ToNumeric: "ToNumeric conversion",
} as const;

type OpcodeKey = keyof typeof OPCODE_INFO;

const TOKEN_INFO = {
  register: "Register (виртуальный регистр байткода V8: r0, r1…; a0 — аргумент)",
  range: "Диапазон регистров (например: r1–r2)",
  index: "Константа/слот/индекс (например: [0], [-1])",
  addr: "Адрес в потоке байткода (0x…)",
  offset: "Смещение инструкции (@ N :)",
  intrinsic: "Внутренняя функция V8 (intrinsic)",
} as const;

type TokenKind = keyof typeof TOKEN_INFO;

const TokenSpan: React.FC<Props> = ({ token }) => {
  const style: CSSProperties = {
    color: token.color ?? "inherit",
    whiteSpace: "pre",
  };

  if (token.fontStyle) {
    if (token.fontStyle & 1) style.fontStyle = "italic";
    if (token.fontStyle & 2) style.fontWeight = "bold";
    if (token.fontStyle & 4) style.textDecoration = "underline";
  }

  const raw = token.content ?? "";
  const text = raw.trim();

  const opcodeKey = getOpcodeKey(text);
  const opcodeDescription = opcodeKey ? OPCODE_INFO[opcodeKey] : undefined;

  const tokenKind = opcodeDescription ? undefined : detectTokenKind(text);
  const tokenKindDescription = tokenKind ? TOKEN_INFO[tokenKind] : undefined;

  const content = <span style={style}>{token.content}</span>;

  if (!opcodeDescription && !tokenKindDescription) {
    return content;
  }

  const tooltipContent = <OpcodeTooltipContent opcode={text} description={opcodeDescription ?? tokenKindDescription} />;

  return (
    <Tooltip content={tooltipContent} showArrow>
      <Text as="span" cursor="pointer">
        {content}
      </Text>
    </Tooltip>
  );
};

const OpcodeTooltipContent = ({ opcode, description }: { opcode: string; description: ReactNode }) => (
  <span style={{ display: "inline-block", maxWidth: 320, lineHeight: 1.4 }}>
    <strong style={{ display: "block", marginBottom: 4 }}>{opcode}</strong>
    <span style={{ opacity: 0.9 }}>{description}</span>
  </span>
);

/** ── Helpers ─────────────────────────────────────────────────── */

function getOpcodeKey(text: string): OpcodeKey | undefined {
  if (!text) return undefined;
  if (text in OPCODE_INFO) {
    return text as OpcodeKey;
  }
  return undefined;
}

function detectTokenKind(text: string): TokenKind | undefined {
  if (!text) return undefined;

  // r0, r1, r2…, a0, a1…
  if (/^(r|a)\d+$/.test(text)) {
    return "register";
  }

  // r0-r2, r1–r3 (с разными дефисами)
  if (/^r\d+\s*[-–]\s*r\d+$/.test(text)) {
    return "range";
  }

  // [0], [-1], [10]
  if (/^\[-?\d+\]$/.test(text)) {
    return "index";
  }

  // 0x3dfd00100100
  if (/^0x[0-9a-f]+$/i.test(text)) {
    return "addr";
  }

  // @ 33
  if (/^@\s*\d+$/.test(text)) {
    return "offset";
  }

  // Внутренние имена intrinsics: _AsyncFunctionEnter, _AsyncFunctionAwait, …
  if (/^_?[A-Z][A-Za-z0-9_]*$/.test(text) && text.includes("AsyncFunction")) {
    return "intrinsic";
  }

  return undefined;
}

export default TokenSpan;
