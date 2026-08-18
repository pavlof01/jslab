import { createDescriber, fromTable, stripEdges, type TokenDescriber } from "./resolver";

/** SpiderMonkey bytecode opcodes and token descriptions (text disassembly). */
export const OPCODE_INFO = {
  // Environments / scopes
  PushLexicalEnv: "Push a new lexical environment (block/function lexical scope).",
  PopLexicalEnv: "Pop the current lexical environment.",
  DebugLeaveLexicalEnv: "Debug-only marker for leaving a lexical environment (affects debugger/stepping).",
  InitLexical: "Initialize a lexical binding slot (let/const) from the current stack value.",
  InitAliasedLexical: "Initialize an aliased lexical binding (stored in an environment object).",
  SetAliasedVar: "Store to an aliased variable (stored in an environment object).",

  // Stack / locals
  Pop: "Pop the top value from the VM stack.",
  Dup: "Duplicate the top stack value.",
  Dup2: "Duplicate the top two stack values.",
  DupAt: "Duplicate a value at a given stack depth.",
  Swap: "Swap the top two stack values.",
  SetLocal: "Store the top stack value into a local slot.",
  GetLocal: "Push a local slot value onto the stack.",

  // Constants / literals
  Uninitialized: "Push the internal 'uninitialized' sentinel (used for TDZ and lexical init tracking).",
  Undefined: "Push JavaScript undefined.",
  Null: "Push JavaScript null.",
  True: "Push boolean true.",
  False: "Push boolean false.",
  NewInit: "Create a new plain object literal (empty object).",

  // Functions / closures
  Lambda: "Create a function object (lambda/closure).",
  FunWithProto: "Create a function with an explicit prototype object (used for classes/constructors).",

  // Calls / returns
  CallIgnoresRv: "Call a function and ignore its return value.",
  RetRval: "Return the current return value (RVAL).",

  // Properties / objects
  InitLockedProp: "Initialize a locked property on an object (used for prototypes/class setup).",
  InitHiddenProp: "Initialize a hidden/internal property on an object (engine-internal fast-path).",
  InitHiddenPropGetter: "Initialize a hidden property getter.",
  InitHiddenPropSetter: "Initialize a hidden property setter.",
  GetProp: "Get an object property by name.",
  ObjWithProto: "Create an object with an explicit prototype (used for class prototype objects).",

  // Classes / heritage
  CheckClassHeritage: "Validate/normalize class heritage (extends) value.",
  BuiltinObject: "Push a builtin object by index (engine-internal builtin table).",
  InitHomeObject: "Initialize home object for methods (for super binding).",

  // Comparisons
  StrictNe: "Strict not-equal comparison (!==).",

  // Control flow
  Goto: "Unconditional branch to a target bytecode offset.",
  JumpIfFalse: "Conditional branch if the condition is falsey.",
  JumpTarget: "A jump target marker (often carries inline cache metadata).",
} as const;

export type SpiderMonkeyOpcode = keyof typeof OPCODE_INFO;

const strip = (token: string) => stripEdges(token);

const describeOpcode = fromTable(OPCODE_INFO as Record<string, string>);

function describeOffset(token: string): string | undefined {
  // Instruction offsets are printed as 5 digits: 00000, 00344, etc.
  if (!/^\d{5}$/.test(token)) return undefined;
  return `Bytecode offset ${token} (instruction address within this function's script).`;
}

function describeLabel(token: string): string | undefined {
  // e.g. main:
  const m = token.match(/^([A-Za-z0-9_]+):$/);
  if (!m) return undefined;
  return `Label "${m[1]}" (named bytecode block).`;
}

function describeQuotedString(token: string): string | undefined {
  const m = token.match(/^"([^"]*)"$/);
  if (!m) return undefined;
  return `String/atom: "${m[1]}".`;
}

function describeInlineCacheKeyValue(token: string): string | undefined {
  const m = token.match(/^(ic|hops|slot):(\d+)$/);
  if (!m) return undefined;

  const key = m[1];
  const value = m[2];
  if (key === "ic") return `Inline cache (IC) index: ${value}.`;
  if (key === "hops") return `Environment hops: ${value} (number of environment links to traverse).`;
  if (key === "slot") return `Environment slot index: ${value}.`;
  return undefined;
}

function describeStackCommentTag(token: string): string | undefined {
  if (token === "FUN") return "Stack annotation: function value.";
  if (token === "OBJ") return "Stack annotation: object value.";
  if (token === "UNINITIALIZED") return "Stack annotation: uninitialized/TDZ sentinel.";
  return undefined;
}

export const describeToken: TokenDescriber = createDescriber({
  strip,
  steps: [
    describeOpcode,
    { joinNext: describeInlineCacheKeyValue, onlyDigits: true },
    describeInlineCacheKeyValue,
    describeOffset,
    describeLabel,
    describeQuotedString,
    describeStackCommentTag,
  ],
});
