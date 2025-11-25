export const META_REGISTER_FAMILY = {
  Star: "Store accumulator into register r{N}. Example: Star14 → r14.",
  Ldar: "Load register r{N} into the accumulator. Example: Ldar7 → load from r7.",
} as const;

export const SPECIAL_REGISTERS: Record<string, string> = {
  "<closure>": "the current function closure object (includes environment)",
  "<context>": "the current lexical context for this function or block",
  "<this>": "the current function's 'this' value",
  "<new.target>": "the current function's 'new.target' value",
  "<generator>": "the internal generator object for generator/async functions",
  "<super>": "the internal reference used for 'super' property access/calls",
  "<homeobject>": "the internal 'home object' used for 'super' resolution in methods",
};

export const META_SECTIONS: Record<string, string> = {
  "Constant pool": "Array of constants (literals, strings, shared infos, boilerplates) referenced by this bytecode.",
  "Handler Table": "Exception handler table used for try/catch/finally and other control-flow handlers.",
  "Source Position Table":
    "Mapping between bytecode offsets and original source positions (for stack traces, debugging, coverage).",
};

export const OPCODE_INFO = {
  Add: "Add a register value to the accumulator.",
  AddSmi: "Add a small integer constant to the accumulator.",

  Mov: "Move a value between registers or between a special register and a normal register.",

  CallAnyReceiver: "Call a function with any prepared receiver.",
  CallProperty0: "Call an object's property with zero arguments.",
  CallProperty1: "Call an object's property with one argument.",
  CallProperty2: "Call an object's property with two arguments.",
  CallRuntime: "Call an internal V8 runtime function.",
  CallUndefinedReceiver1: "Call a function with undefined as receiver and one argument.",

  Construct: "Invoke a constructor (like 'new').",

  CreateArrayLiteral: "Create an array literal using boilerplate.",
  CreateBlockContext: "Create a new block-scope lexical context.",
  CreateCatchContext: "Create a catch-scope context.",
  CreateClosure: "Create a function closure using the current context.",
  CreateIterResultObject: "Create { value, done } iterator result.",
  CreateObjectLiteral: "Create an object literal using boilerplate.",

  DefineNamedOwnProperty: "Define a named own property on an object.",

  DivSmi: "Divide the accumulator by a small integer constant.",

  FindNonDefaultConstructorOrConstruct: "Resolve correct constructor target for 'super' calls.",

  ForInEnumerate: "Prepare an object for for-in enumeration.",
  ForInPrepare: "Initialize for-in enumeration state.",
  ForInNext: "Get the next property key for for-in.",
  ForInStep: "Advance the for-in index in a for-in loop.",
  GetEnumeratedKeyedProperty: "Load a property value using a key from for-in enumeration.",

  GetIterator: "Get an iterator object from an iterable.",
  GetNamedProperty: "Load an object's named property.",
  GetNamedPropertyFromSuper: "Load a property from super.prototype.",

  Inc: "Increment value by 1.",

  Jump: "Unconditional jump.",
  JumpIfFalse: "Jump if accumulator converts to false.",
  JumpIfTrue: "Jump if accumulator converts to true.",
  JumpIfNotUndefined: "Jump if accumulator is not undefined.",
  JumpIfUndefinedOrNull: "Jump if accumulator is undefined OR null.",
  JumpIfToBooleanFalse: "Jump if ToBoolean(accumulator) is false.",
  JumpIfToBooleanTrue: "Jump if ToBoolean(accumulator) is true.",
  JumpIfJSReceiver: "Jump if accumulator is a JS receiver object.",
  JumpLoop: "Backward jump used for loops.",
  JumpIfForInDone: "Jump if for-in enumeration is complete.",

  LdaZero: "Load Smi 0 into the accumulator.",
  LdaTheHole: "Load internal 'hole' value.",
  LdaUndefined: "Load undefined into the accumulator.",
  LdaTrue: "Load boolean true into the accumulator.",
  LdaFalse: "Load boolean false into the accumulator.",
  LdaSmi: "Load a small integer literal (SMI) into the accumulator.",
  LdaGlobal: "Load a global variable into the accumulator.",
  LdaConstant: "Load a constant from the constant pool.",
  LdaCurrentContextSlot: "Load from current context slot.",
  LdaCurrentContextSlotNoCell: "Load from current context slot without cell indirection.",
  LdaImmutableCurrentContextSlot: "Load from an immutable current context slot.",

  MulSmi: "Multiply accumulator by a small integer.",

  ReThrow: "Re-throw the current pending exception.",
  ResumeGenerator: "Resume a suspended generator.",
  Return: "Return accumulator from the current function.",

  SetNamedProperty: "Write accumulator to an object's named property.",
  SetPendingMessage: "Store accumulator as the pending exception message.",

  StaCurrentContextSlot: "Store accumulator into a context slot.",
  StaCurrentContextSlotNoCell: "Store accumulator into a context slot without cell indirection.",

  SuspendGenerator: "Suspend the current generator state.",
  SwitchOnGeneratorState: "Switch control flow based on the generator state index.",
  SwitchOnSmiNoFeedback: "Switch on a small integer value using a jump table (no feedback).",

  TestEqualStrict: "Strict equality comparison (===).",
  TestGreaterThan: "Greater-than comparison (accumulator > operand).",
  TestInstanceOf: "instanceof operator implementation.",
  TestLessThan: "Less-than comparison (accumulator < operand).",
  TestReferenceEqual: "Reference equality comparison (same object reference).",

  Throw: "Throw the accumulator as an exception.",
  ThrowIfNotSuperConstructor: "Throw if super constructor is invalid.",
  ThrowReferenceErrorIfHole: "Throw ReferenceError for TDZ uninitialized binding (hole).",
  ThrowSuperAlreadyCalledIfNotHole: "Throw if super() was called more than once.",
  ThrowSuperNotCalledIfHole: "Throw if super() has not been called before using 'this'.",

  ToNumeric: "Convert accumulator to numeric using ToNumeric().",
  ToObject: "Convert accumulator to object using ToObject().",
} as const;

export type BaseOpcode = keyof typeof OPCODE_INFO;

/**
 * Handle register-based opcodes whose register index is encoded in the mnemonic,
 * e.g. Star0, Star14, Ldar7, etc.
 */
export function resolveRegisterOpcode(opcode: string): string | undefined {
  const key = opcode.trim();
  if (!key) return undefined;

  let m: RegExpMatchArray | null;

  // StarN
  m = key.match(/^Star(\d+)$/);
  if (m) {
    return `Store accumulator into register r${m[1]}.`;
  }

  // LdarN
  m = key.match(/^Ldar(\d+)$/);
  if (m) {
    return `Load register r${m[1]} into the accumulator.`;
  }

  // Generic forms
  if (key === "Star") {
    return "Store accumulator into a register (index follows).";
  }
  if (key === "Ldar") {
    return "Load a register value into the accumulator (index follows).";
  }

  // Mov
  if (key === "Mov") {
    return "Move a value between registers or from a special register into a normal register.";
  }

  // Mov rX, rY
  m = key.match(/^Mov\s+r(\d+),\s*r(\d+)$/);
  if (m) {
    return `Move value from register r${m[1]} to register r${m[2]}.`;
  }

  // Mov <special>, rX
  m = key.match(/^Mov\s+<([^>]+)>,\s*r(\d+)$/);
  if (m) {
    const specialName = `<${m[1]}>`;
    const desc = SPECIAL_REGISTERS[specialName];
    if (desc) {
      return `Move ${desc} into register r${m[2]}.`;
    }
    return `Move special register ${specialName} into register r${m[2]}.`;
  }

  return undefined;
}

/**
 * Resolve memory/code addresses printed by V8 in the bytecode dump.
 *
 * Supported examples:
 *   0x25c3001000a0
 *   0x140c00100db4
 *   0x140c00100db4:
 *
 * This does NOT influence semantics — these values are internal tagged
 * pointers or code object addresses printed for debugging/correlation.
 */
function resolveAddressToken(fragment: string): string | undefined {
  const key = fragment.trim();
  if (!key) return undefined;

  // Optional trailing colon: "0x1234:" → valid
  const m = key.match(/^0x[0-9a-fA-F]+:?$/);
  if (!m) return undefined;

  return (
    "Internal V8 code/memory address (tagged pointer / code object). " +
    "Used only for debugging and correlating disassembly output."
  );
}

/**
 * Resolve function-level metadata printed by V8 in bytecode dumps.
 *
 * Supported patterns:
 *   "Bytecode length: N"
 *   "Parameter count N"
 *   "Register count N"
 *   "Frame size N"
 */
function resolveFunctionMetadata(fragment: string): string | undefined {
  const s = fragment.trim();
  if (!s) return undefined;

  // Bytecode length
  let m = s.match(/^Bytecode length:\s*(\d+)$/);
  if (m) {
    return `Total number of bytecode instructions emitted for this function (${m[1]} ops).`;
  }

  // Parameter count
  m = s.match(/^Parameter count\s+(\d+)$/);
  if (m) {
    return `Number of declared parameters for this function (${m[1]}).`;
  }

  // Register count
  m = s.match(/^Register count\s+(\d+)$/);
  if (m) {
    return (
      `Number of virtual registers allocated for this function (` +
      `${m[1]}). Registers store temporary values during execution.`
    );
  }

  // Frame size
  m = s.match(/^Frame size\s+(\d+)$/);
  if (m) {
    return (
      `Stack frame size in bytes used by this function at runtime (` +
      `${m[1]} bytes). Includes registers, locals, spills, etc.`
    );
  }

  return undefined;
}

/**
 * Meta-descriptions of various sections in the bytecode:
 *   "Constant pool (size = 0)"
 *   "Handler Table (size = 32)"
 *   "Source Position Table (size = 0)"
 */
export function getSectionInfo(rawLine: string | null | undefined): string | undefined {
  if (!rawLine) return undefined;
  const line = rawLine.trim();
  if (!line) return undefined;

  const name = line.split("(")[0].trim();

  const direct = META_SECTIONS[name];
  if (direct) return direct;

  return undefined;
}

export function getOpcodeInfo(rawToken: string | null | undefined): string | undefined {
  if (!rawToken) return undefined;

  const key = rawToken.trim();
  if (!key) return undefined;

  const direct = (OPCODE_INFO as Record<string, string>)[key];
  if (direct) return direct;

  const registerFamily = resolveRegisterOpcode(key);
  if (registerFamily) return registerFamily;

  return undefined;
}

/**
 * Unified helper for any bytecode-related token:
 *  - opcodes (normal or register-based)
 *  - memory addresses (0x...)
 *  - special V8 dump sections (Constant pool, Handler Table, ...)
 *  - special registers (<closure>, <context>, ...)
 */
export function getBytecodeInfo(fragment: string | null | undefined): string | undefined {
  if (!fragment) return undefined;
  const key = fragment.trim();
  if (!key) return undefined;

  // 1) Opcodes
  const opcodeInfo = getOpcodeInfo(key);
  if (opcodeInfo) return opcodeInfo;

  // 2) Memory address
  const addressInfo = resolveAddressToken(key);
  if (addressInfo) return addressInfo;

  // 3) Function metadata (Bytecode length, Register count, etc.)
  const metadataInfo = resolveFunctionMetadata(key);
  if (metadataInfo) return metadataInfo;

  // 4) Sections (Constant pool, Handler Table, Source Position Table)
  const sectionInfo = getSectionInfo(key);
  if (sectionInfo) return sectionInfo;

  // 5) Special registers (<closure>, <context>, ...)
  const special = SPECIAL_REGISTERS[key];
  if (special) return special;

  return undefined;
}
