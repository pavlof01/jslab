import { createDescriber, fromTable, type TokenDescriber } from "./resolver";

/** Meta description for register-based opcode families (not used directly as opcodes). */
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

/** Plain (non register-suffixed) V8 bytecode opcodes and their descriptions. */
export const OPCODE_INFO = {
  Add: "Add a register value to the accumulator.",
  AddSmi: "Add a small integer constant to the accumulator.",

  BitwiseAnd: "Bitwise AND between accumulator and operand.", // NEW
  BitwiseOr: "Bitwise OR between accumulator and operand.", // NEW
  BitwiseXor: "Bitwise XOR between accumulator and operand.", // NEW

  CallAnyReceiver: "Call a function with any prepared receiver.",
  CallProperty0: "Call an object's property with zero arguments.",
  CallProperty1: "Call an object's property with one argument.",
  CallProperty2: "Call an object's property with two arguments.",
  CallRuntime: "Call an internal V8 runtime function.",
  CallUndefinedReceiver0: "Call a function with undefined as receiver and zero arguments.", // NEW
  CallUndefinedReceiver1: "Call a function with undefined as receiver and one argument.",

  CloneObject: "Clone an object, usually using a boilerplate and possibly copying properties.", // NEW

  Construct: "Invoke a constructor (like 'new').",

  CreateArrayFromIterable: "Create an array from an iterable using its iterator protocol.", // NEW
  CreateArrayLiteral: "Create an array literal using boilerplate.",
  CreateBlockContext: "Create a new block-scope lexical context.",
  CreateCatchContext: "Create a catch-scope context.",
  CreateClosure: "Create a function closure using the current context.",
  CreateIterResultObject: "Create { value, done } iterator result.",
  CreateObjectLiteral: "Create an object literal using boilerplate.",
  CreateRestParameter: "Create an array containing the rest parameters of the current call.", // NEW
  CreateUnmappedArguments:
    "Create an unmapped 'arguments' object (no aliasing between indices and parameters).", // NEW

  DefineNamedOwnProperty: "Define a named own property on an object.",

  Div: "Divide the accumulator by the operand (floating-point division).", // NEW
  DivSmi: "Divide the accumulator by a small integer constant.",

  FindNonDefaultConstructorOrConstruct:
    "Resolve correct constructor or construct target for 'super' calls.",

  ForInEnumerate: "Prepare an object for for-in enumeration.",
  ForInNext: "Get the next property key for for-in.",
  ForInPrepare: "Initialize for-in enumeration state.",
  ForInStep: "Advance the for-in index in a for-in loop.",

  GetEnumeratedKeyedProperty: "Load a property value using a key produced by for-in enumeration.",
  GetIterator: "Get an iterator object from an iterable.",
  GetKeyedProperty:
    "Load a property using a dynamic key (index or string) from an object or array.", // NEW
  GetNamedProperty: "Load an object's named property.",
  GetNamedPropertyFromSuper:
    "Load a named property from super.prototype, bypassing the current receiver's own properties.",

  Inc: "Increment value by 1.",

  InvokeIntrinsic:
    "Invoke an internal V8 intrinsic (e.g. _AsyncFunctionEnter, _AsyncFunctionAwait).", // NEW

  Jump: "Unconditional jump.",
  JumpIfFalse: "Jump if accumulator converts to false.",
  JumpIfForInDone: "Jump if for-in enumeration is complete.",
  JumpIfJSReceiver: "Jump if accumulator is a JS receiver object.",
  JumpIfNotUndefined: "Jump if accumulator is not undefined.",
  JumpIfToBooleanFalse: "Jump if ToBoolean(accumulator) is false.",
  JumpIfToBooleanTrue: "Jump if ToBoolean(accumulator) is true.",
  JumpIfTrue: "Jump if accumulator converts to true.",
  JumpIfUndefinedOrNull: "Jump if accumulator is undefined OR null.",
  JumpLoop: "Backward jump used for loops.",

  LdaConstant: "Load a constant from the constant pool.",
  LdaContextSlot: "Load from a context slot (possibly non-current context, using depth + index).", // NEW
  LdaCurrentContextSlot: "Load from current context slot.",
  LdaCurrentContextSlotNoCell: "Load from current context slot without cell indirection.",
  LdaFalse: "Load boolean false into the accumulator.",
  LdaGlobal: "Load a global variable into the accumulator.",
  LdaImmutableCurrentContextSlot: "Load from an immutable current context slot.",
  LdaSmi: "Load a small integer literal (SMI) into the accumulator.",
  LdaTheHole: "Load internal 'hole' value.",
  LdaTrue: "Load boolean true into the accumulator.",
  LdaUndefined: "Load undefined into the accumulator.",
  LdaZero: "Load Smi 0 into the accumulator.",

  Mod: "Compute remainder of accumulator divided by operand (acc % operand).", // NEW

  Mov: "Move a value between registers or between a special pseudo-register and a normal register.", // NEW

  Mul: "Multiply the accumulator by the operand.", // NEW
  MulSmi: "Multiply accumulator by a small integer.",

  Negate: "Negate the accumulator using unary minus (-acc).", // NEW

  PopContext: "Pop the current context, restoring the previous lexical context.", // NEW
  PushContext: "Push a new lexical context onto the context stack as the current context.", // NEW

  ReThrow: "Re-throw the current pending exception.",
  ResumeGenerator: "Resume a suspended generator.",
  Return: "Return accumulator from the current function.",

  SetNamedProperty: "Write accumulator to an object's named property.",
  SetPendingMessage:
    "Store accumulator as the pending exception message for the current exception.",

  ShiftLeftSmi: "Left shift (<<) between accumulator and small integer operand (SMI-optimized).", // NEW
  ShiftRightLogicalSmi:
    "Logical right shift (>>>) between accumulator and small integer operand (SMI-optimized).", // NEW
  ShiftRightSmi:
    "Arithmetic right shift (>>) between accumulator and small integer operand (SMI-optimized).", // NEW

  StaCurrentContextSlot: "Store accumulator into a context slot.",
  StaCurrentContextSlotNoCell: "Store accumulator into a context slot without cell indirection.",
  StaInArrayLiteral:
    "Store accumulator into an array literal element and update feedback for the literal.", // NEW

  Sub: "Subtract operand from accumulator (accumulator - operand).", // NEW

  SuspendGenerator: "Suspend the current generator state.",
  SwitchOnGeneratorState: "Switch control flow based on the generator state index.",
  SwitchOnSmiNoFeedback: "Switch on a small integer value using a jump table (no feedback).",

  TestEqual: "Abstract equality comparison (==) between accumulator and operand.", // NEW
  TestEqualStrict: "Strict equality comparison (===) between accumulator and operand.",
  TestGreaterThan: "Greater-than comparison (accumulator > operand).",
  TestGreaterThanOrEqual: "Greater-than-or-equal comparison (accumulator >= operand).", // NEW
  TestIn: "Implement the 'in' operator (key in object).", // NEW
  TestInstanceOf: "instanceof operator implementation.",
  TestLessThan: "Less-than comparison (accumulator < operand).",
  TestLessThanOrEqual: "Less-than-or-equal comparison (accumulator <= operand).", // NEW
  TestReferenceEqual: "Reference equality comparison (same object reference).",

  Throw: "Throw the accumulator as an exception.",
  ThrowIfNotSuperConstructor: "Throw if super constructor is invalid for a 'super()' call.",
  ThrowReferenceErrorIfHole: "Throw ReferenceError for TDZ uninitialized binding (hole).",
  ThrowSuperAlreadyCalledIfNotHole:
    "Throw if super() was called more than once in a derived constructor.",
  ThrowSuperNotCalledIfHole:
    "Throw if super() has not been called before using 'this' in a derived constructor.",

  ToBooleanLogicalNot:
    "Apply ToBoolean(accumulator) and then logical NOT, i.e. accumulator = !ToBoolean(acc).", // NEW
  ToNumber: "Convert accumulator to a JavaScript Number using ToNumber().", // NEW
  ToNumeric: "Convert accumulator to numeric using ToNumeric().",
  ToObject: "Convert accumulator to object using ToObject().",
} as const;

export type BaseOpcode = keyof typeof OPCODE_INFO;

/* ────────────────────────────────────────────────────────────── */
/*  Register-based opcode resolution (StarN / LdarN / Mov ...)   */
/* ────────────────────────────────────────────────────────────── */

/**
 * Handle register-based opcodes whose register index is encoded in the mnemonic,
 * e.g. Star0, Star14, Ldar7, etc.
 *
 * Examples:
 *   Star0  → "Store accumulator into register r0."
 *   Star14 → "Store accumulator into register r14."
 *   Ldar7  → "Load register r7 into the accumulator."
 */
export function resolveRegisterOpcode(opcode: string): string | undefined {
  const key = opcode.trim();
  if (!key) return undefined;

  let m: RegExpMatchArray | null;

  // "Star0" → store accumulator into r0
  m = key.match(/^Star(\d+)$/);
  if (m) {
    return `Store accumulator into register r${m[1]}.`;
  }

  // "Ldar0" → load r0 → accumulator
  m = key.match(/^Ldar(\d+)$/);
  if (m) {
    return `Load register r${m[1]} into the accumulator.`;
  }

  // Generic Star/Ldar without index (rare, but may appear as templates)
  if (key === "Star") {
    return "Store accumulator into a register (index follows in the bytecode operand).";
  }
  if (key === "Ldar") {
    return "Load a register value into the accumulator (index follows in the bytecode operand).";
  }

  // "Mov r2, r3" – move between regular registers
  m = key.match(/^Mov\s+r(\d+),\s*r(\d+)$/);
  if (m) {
    return `Move value from register r${m[1]} to register r${m[2]}.`;
  }

  // "Mov <closure>, r2" / "Mov <context>, r5" / etc – from special pseudo-registers
  m = key.match(/^Mov\s+<([^>]+)>,\s*r(\d+)$/);
  if (m) {
    const specialName = `<${m[1]}>`;
    const desc = SPECIAL_REGISTERS[specialName];
    if (desc) {
      return `Move ${desc} into register r${m[2]}.`;
    } else {
      // Unknown special register, still give a generic explanation
      return `Move special register ${specialName} into register r${m[2]}.`;
    }
  }

  return undefined;
}

/* ────────────────────────────────────────────────────────────── */
/*  Address / section / header line helpers                      */
/* ────────────────────────────────────────────────────────────── */

function resolveAddressToken(key: string): string | undefined {
  if (!/^0x[0-9a-fA-F]+$/.test(key)) return undefined;
  return "Raw V8 heap or code address. Useful for correlating dumps, but not stable across runs or processes.";
}

function resolveSectionHeader(line: string): string | undefined {
  let m: RegExpMatchArray | null;

  m = line.match(/^Constant pool\s*\(size\s*=\s*(\d+)\)$/i);
  if (m) {
    return `Constant pool: fixed array of ${m[1]} entries used as the function's constant pool (strings, boilerplates, SharedFunctionInfo, etc.).`;
  }

  m = line.match(/^Handler Table\s*\(size\s*=\s*(\d+)\)$/i);
  if (m) {
    return `Handler table with ${m[1]} entries describing try/catch/finally ranges and their handler offsets.`;
  }

  m = line.match(/^Source Position Table\s*\(size\s*=\s*(\d+)\)$/i);
  if (m) {
    return `Source position table of size ${m[1]}, mapping bytecode offsets back to source positions for debugging and coverage.`;
  }

  return undefined;
}

function resolveBytecodeHeader(line: string): string | undefined {
  let m: RegExpMatchArray | null;

  m = line.match(/^Bytecode length:\s*(\d+)$/i);
  if (m) {
    return `Total length of the bytecode array for this function: ${m[1]} bytes (instructions + operands).`;
  }

  m = line.match(/^Parameter count\s*(\d+)$/i);
  if (m) {
    return `Number of declared parameters for this function: ${m[1]}.`;
  }

  m = line.match(/^Register count\s*(\d+)$/i);
  if (m) {
    return `Number of virtual registers allocated for this function: ${m[1]}.`;
  }

  m = line.match(/^Frame size\s*(\d+)$/i);
  if (m) {
    return `Size of this function's stack frame in bytes: ${m[1]} (space for locals, temporaries, spills).`;
  }

  return undefined;
}

/* ────────────────────────────────────────────────────────────── */
/*  Heap meta-tokens: boilerplates, ScopeInfo, SFI, etc.         */
/* ────────────────────────────────────────────────────────────── */

function stripAngleBrackets(key: string): string {
  // Remove a single leading "<" and trailing ">" if present
  if (key.startsWith("<") && key.endsWith(">") && key.length > 2) {
    return key.slice(1, -1).trim();
  }
  return key;
}

/** Describe tokens like ObjectBoilerplateDescription[4], SharedFunctionInfo name, ClassBoilerplate, ScopeInfo CLASS_SCOPE, String[6]: #Object. */
function resolveHeapMetaToken(raw: string): string | undefined {
  let key = stripAngleBrackets(raw);
  let m: RegExpMatchArray | null;

  // ObjectBoilerplateDescription[4]
  m = key.match(/^ObjectBoilerplateDescription\[(\d+)\]$/);
  if (m) {
    return `Object boilerplate description with ${m[1]} elements. Used as a template for object literal shapes and initial values.`;
  }

  // FixedArray[40]
  m = key.match(/^FixedArray\[(\d+)\]$/);
  if (m) {
    return `FixedArray on the V8 heap with ${m[1]} slots, used to store internal metadata or constant pool entries.`;
  }

  if (key === "FixedArray") {
    return "Fixed-size array on the V8 heap, used as a generic container for internal metadata.";
  }

  if (key === "TrustedFixedArray") {
    return "Immutable FixedArray used as a trusted constant pool: holds strings, boilerplates, SharedFunctionInfo, and other constants referenced by bytecode.";
  }

  if (key === "ClassBoilerplate") {
    return "Internal template used to allocate and initialize a JavaScript class (constructor, prototype methods, static methods).";
  }

  // SharedFunctionInfo arrowSimple / Base / fn / etc.
  m = key.match(/^SharedFunctionInfo\s+(.+)$/);
  if (m) {
    const fnName = m[1].trim();
    return `SharedFunctionInfo for function "${fnName}". Holds bytecode, parameter info, scope info, and optimization metadata shared across closures.`;
  }

  // ScopeInfo CLASS_SCOPE / FUNCTION_SCOPE / BLOCK_SCOPE / ...
  m = key.match(/^ScopeInfo\s+([A-Z_]+)$/);
  if (m) {
    const scopeKind = m[1];
    switch (scopeKind) {
      case "FUNCTION_SCOPE":
        return "ScopeInfo for a function scope (parameters, local variables, 'arguments', etc.).";
      case "BLOCK_SCOPE":
        return "ScopeInfo for a block scope (let/const variables inside { ... }).";
      case "SCRIPT_SCOPE":
        return "ScopeInfo for a top-level script/module scope.";
      case "MODULE_SCOPE":
        return "ScopeInfo for an ES module scope (imports/exports and module-local bindings).";
      case "CATCH_SCOPE":
        return "ScopeInfo for a catch scope that binds the exception variable.";
      case "WITH_SCOPE":
        return "ScopeInfo for a 'with' scope (dynamic object-based variable resolution).";
      case "CLASS_SCOPE":
        return "ScopeInfo for a class body scope (class name, private fields, methods).";
      default:
        return `ScopeInfo for ${scopeKind}, describing lexical bindings and their layout in the current scope.`;
    }
  }

  // String[6]: #Object
  m = key.match(/^String\[(\d+)\]:\s*#?(.*)$/);
  if (m) {
    const length = m[1];
    const value = m[2];
    if (value) {
      return `String constant "${value}" of length ${length}, stored in the constant pool.`;
    }
    return `String constant of length ${length}, stored in the constant pool.`;
  }

  return undefined;
}

/* ────────────────────────────────────────────────────────────── */
/*  Main helper                                                   */
/* ────────────────────────────────────────────────────────────── */

export const describeToken: TokenDescriber = createDescriber({
  strip: (token) => token,
  steps: [
    fromTable(OPCODE_INFO as Record<string, string>),
    resolveRegisterOpcode,
    resolveAddressToken,
    resolveSectionHeader,
    resolveBytecodeHeader,
    resolveHeapMetaToken,
  ],
});
