import { createDescriber, fromLiterals, stripEdges, type TokenDescriber } from "./resolver";

/** Plain Hermes bytecode opcodes and their descriptions (hbcdump disassembly). */
export const OPCODE_INFO = {
  // Environment / closures
  CreateFunctionEnvironment:
    "Create a new function environment (lexical scope) with a fixed number of slots.",
  CreateTopLevelEnvironment:
    "Create a top-level environment object (used for closures and generators).",
  GetParentEnvironment: "Load the parent (outer) environment for the current function/closure.",
  LoadFromEnvironment: "Load a value from an environment slot into a register.",
  StoreToEnvironment: "Store a value into an environment slot (pointer slot).",
  StoreNPToEnvironment:
    "Store a value into an environment slot without a write barrier (non-pointer / known-safe).",
  LoadParentNoTraps: "Load a parent environment without triggering traps (fast-path).",

  // Globals / identifiers / property access
  GetGlobalObject: "Load the global object into a register.",
  DeclareGlobalVar: "Declare a global variable binding (var/function at top-level).",
  TryGetById:
    "Try to get a property by identifier from an object; usually does not throw if missing.",
  GetByIdShort: "Fast-path property load by identifier (short form).",
  GetByIdWithReceiverLong:
    "Load a property with an explicit receiver (used for super/with-receiver patterns).",
  PutByIdStrict: "Store a property by identifier with strict-mode semantics.",
  PutOwnBySlotIdx:
    "Store into an object's own property slot by slot index (layout-based fast-path).",
  GetByVal: "Load a property by a dynamic key (value) from an object/array.",

  // Constants
  LoadConstUndefined: "Load the JavaScript value undefined into a register.",
  LoadConstNull: "Load the JavaScript value null into a register.",
  LoadConstTrue: "Load boolean true into a register.",
  LoadConstZero: "Load numeric 0 into a register.",
  LoadConstUInt8: "Load an unsigned 8-bit integer immediate constant into a register.",
  LoadConstInt: "Load an integer immediate constant into a register.",
  LoadConstString: "Load a string constant into a register.",
  LoadConstEmpty: "Load the internal 'empty' sentinel used by Hermes (implementation detail).",

  // Moves / conversions
  Mov: "Move a value from one register to another.",
  ToNumber: "Convert a value to Number (ToNumber).",
  Not: "Compute logical NOT (!value).",
  Negate: "Compute numeric negation (-value).",
  Inc: "Increment a value by 1 (in-place / result in destination).",

  // Arithmetic / bitwise
  Add: "Add two values (a + b).",
  AddN: "Add numeric values (optimized numeric add).",
  Sub: "Subtract two values (a - b).",
  Mul: "Multiply two values (a * b).",
  MulN: "Multiply numeric values (optimized numeric multiply).",
  Div: "Divide two values (a / b).",
  Mod: "Remainder operation (a % b).",
  BitAnd: "Bitwise AND (a & b).",
  BitOr: "Bitwise OR (a | b).",
  BitXor: "Bitwise XOR (a ^ b).",
  LShift: "Left shift (a << b).",
  RShift: "Arithmetic right shift (a >> b).",
  URshift: "Logical right shift (a >>> b).",

  // Comparisons / tests
  Eq: "Abstract equality comparison (==).",
  StrictEq: "Strict equality comparison (===).",
  Less: "Less-than comparison (a < b).",
  Greater: "Greater-than comparison (a > b).",
  InstanceOf: "instanceof operator check.",
  IsIn: "in operator check (key in object).",

  // Control flow
  Jmp: "Unconditional jump to a label.",
  JmpTrue: "Jump if the condition is truthy.",
  JmpFalse: "Jump if the condition is falsy.",
  JmpUndefined: "Jump if the value is undefined.",
  JLess: "Jump if a < b.",
  JGreater: "Jump if a > b.",
  JEqual: "Jump if a == b.",
  JNotEqual: "Jump if a != b.",
  JStrictEqual: "Jump if a === b.",
  JStrictNotEqual: "Jump if a !== b.",
  JStrictEqualLong: "Jump if a === b (long/extended form).",
  JNotLess: "Jump if NOT (a < b).",
  JNotLessEqual: "Jump if NOT (a <= b).",
  JNotGreater: "Jump if NOT (a > b).",
  JNotGreaterEqual: "Jump if NOT (a >= b).",
  JmpTypeOfIs: "Jump based on typeof check (used for fast-path type guards).",
  JmpBuiltinIs: "Jump based on a builtin identity/type predicate (Hermes internal).",

  // Objects / arrays
  NewObject: "Create a new empty object.",
  NewObjectWithBuffer: "Create a new object using a precomputed shape/key buffer.",
  NewObjectWithParent: "Create a new object with an explicit prototype/parent.",
  NewArray: "Create a new array.",
  NewArrayWithBuffer: "Create a new array literal using a literal buffer.",
  DefineOwnByVal: "Define an own property by dynamic key (value).",
  DefineOwnById: "Define an own property by identifier/index.",
  DefineOwnInDenseArray: "Define an element in a dense array (array literal initialization).",
  DefineOwnGetterSetterByVal: "Define a getter/setter pair by dynamic key (value).",

  // Iteration / enumerators
  IteratorBegin: "Begin iteration over an iterable (create iterator record).",
  IteratorNext: "Advance an iterator and get the next value/result.",
  IteratorClose: "Close an iterator (used for abrupt completion / finally).",
  GetPNameList: "Get property name list for for-in enumeration (fast path).",
  GetNextPName: "Get next property name during for-in enumeration.",

  // Calls / construction
  Call: "Call a function (variadic form).",
  Call1: "Call a function with 1 argument.",
  Call2: "Call a function with 2 arguments.",
  Call3: "Call a function with 3 arguments.",
  Call4: "Call a function with 4 arguments.",
  CallWithNewTarget: "Call a function with an explicit new.target (used for super calls).",
  CallBuiltin: "Call an internal Hermes builtin helper by name.",
  Construct: "Construct an object via new (call a constructor).",

  // Classes / generators / async
  CreateClosure: "Create a closure for a referenced function (captures an environment if needed).",
  CreateGenerator: "Create a generator object for a generator/async function body.",
  GetBuiltinClosure: "Load a builtin closure (internal function) by name.",
  ReifyArgumentsStrict: "Materialize the arguments object in strict mode (for passing/escaping).",
  CreateThisForNew: "Create 'this' for a constructor call (new target path).",
  CreateThisForSuper: "Create 'this' for a super constructor call (derived class).",
  GetNewTarget: "Load the current new.target value.",
  CreateBaseClass: "Create a base class constructor/prototype pair.",
  CreateDerivedClass: "Create a derived class constructor/prototype pair (with superclass).",
  SelectObject:
    "Select between two objects (used after constructor calls to choose returned object vs this).",

  // Exceptions
  Throw: "Throw an exception.",
  Catch: "Catch the current exception into a register.",
  ThrowIfThisInitialized:
    "Throw if 'this' has already been initialized (super() called more than once).",
} as const;

export type HermesOpcode = keyof typeof OPCODE_INFO;

const strip = (token: string) => stripEdges(token, { keepColon: false });

function describeRegister(token: string): string | undefined {
  const m = token.match(/^r(\d+)$/);
  if (!m) return undefined;
  return `Hermes virtual register r${m[1]} (register-based bytecode value slot).`;
}

function describeLabel(token: string): string | undefined {
  const m = token.match(/^L(\d+)$/);
  if (!m) return undefined;
  return `Bytecode label L${m[1]} (jump target).`;
}

function describeFunctionRef(token: string): string | undefined {
  const m = token.match(/^(Function|NCFunction|Constructor)<([^>]+)>(\d+)$/);
  if (!m) return undefined;

  const kind = m[1];
  const name = m[2];
  const id = m[3];

  if (kind === "NCFunction") {
    return `Reference to non-capturing function ${name} (id ${id}).`;
  }
  if (kind === "Constructor") {
    return `Reference to constructor ${name} (id ${id}).`;
  }
  return `Reference to function ${name} (id ${id}).`;
}

function describeStringOrIdentifierIndex(token: string): string | undefined {
  const m = token.match(/^([si])(\d+)$/);
  if (!m) return undefined;

  const kind = m[1];
  const id = m[2];
  if (kind === "s") return `Global String Table entry s${id} (string constant).`;
  return `Identifier/String Kind entry i${id} (identifier-like string constant).`;
}

function describeHash(token: string): string | undefined {
  if (!/^#[0-9A-Fa-f]+$/.test(token)) return undefined;
  return "Hash/ID printed by hbcdump (stable within this bytecode file).";
}

function describeQuotedString(token: string): string | undefined {
  const m = token.match(/^"([^"]*)"$/);
  if (!m) return undefined;

  const value = m[1];
  if (value.startsWith("HermesBuiltin.")) {
    return `Hermes builtin helper name: ${value}.`;
  }
  return `String literal: "${value}".`;
}

export function getOpcodeInfo(rawToken: string | null | undefined): string | undefined {
  if (!rawToken) return undefined;
  const key = rawToken.trim();
  if (!key) return undefined;

  const direct = (OPCODE_INFO as Record<string, string>)[key];
  if (direct) return direct;

  const call = key.match(/^Call(\d+)$/);
  if (call) return `Call a function with ${call[1]} argument(s).`;

  return undefined;
}

const LITERALS: Record<string, string> = {
  null: "JavaScript null literal.",
  undefined: "JavaScript undefined literal.",
  true: "Boolean true literal.",
  false: "Boolean false literal.",
  "<global>": "Global scope marker used by hbcdump.",
};

export const describeToken: TokenDescriber = createDescriber({
  strip,
  steps: [
    getOpcodeInfo,
    describeRegister,
    describeLabel,
    describeFunctionRef,
    describeStringOrIdentifierIndex,
    describeHash,
    describeQuotedString,
    fromLiterals(LITERALS),
    { joinNext: getOpcodeInfo },
  ],
});
