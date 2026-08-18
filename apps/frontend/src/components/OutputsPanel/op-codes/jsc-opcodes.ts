import { createDescriber, fromLiterals, fromTable, stripEdges, type TokenDescriber } from "./resolver";

export const OPCODE_INFO = {
  // Function prologue / epilogue
  enter: "Establish a new stack frame for the current function.",
  end: "End the current program/entry execution (top-level).",
  ret: "Return a value from the current function.",

  // Function creation
  new_func: "Create a new function object from a function declaration (captures the given scope).",
  new_func_exp: "Create a new function object from a function expression (captures the given scope).",
  new_async_func: "Create a new async function object (captures the given scope).",
  new_generator_func: "Create a new generator function object (captures the given scope).",

  // Moves / constants / conversions
  mov: "Move a value from a source to a destination register.",
  to_this: "Convert/initialize the implicit 'this' value according to the current ECMAScript mode.",
  to_number: "Convert a value to Number (ToNumber).",
  to_numeric: "Convert a value to numeric (ToNumeric).",
  unsigned: "Convert a value to unsigned 32-bit integer (>>> 0).",
  not: "Compute logical NOT (!operand).",
  negate: "Compute numeric negation (-operand).",

  // Arithmetic / bitwise
  add: "Add two operands (lhs + rhs).",
  sub: "Subtract two operands (lhs - rhs).",
  mul: "Multiply two operands (lhs * rhs).",
  div: "Divide two operands (lhs / rhs).",
  mod: "Remainder operation (lhs % rhs).",
  bitand: "Bitwise AND (lhs & rhs).",
  bitor: "Bitwise OR (lhs | rhs).",
  bitxor: "Bitwise XOR (lhs ^ rhs).",
  lshift: "Left shift (lhs << rhs).",
  rshift: "Arithmetic right shift (lhs >> rhs).",
  urshift: "Logical right shift (lhs >>> rhs).",
  inc: "Increment an in-place value (x++ / ++x depending on lowering).",

  // Control flow
  loop_hint: "Loop back-edge marker/hint used for profiling/OSR and trap checks.",
  check_traps: "Check for pending interrupts/traps (e.g. termination, debugger, GC safepoints).",
  jmp: "Unconditional jump to targetLabel.",
  jtrue: "Jump to targetLabel if condition is truthy.",
  jfalse: "Jump to targetLabel if condition is falsy.",
  jundefined_or_null: "Jump to targetLabel if value is undefined or null.",
  jnundefined_or_null: "Jump to targetLabel if value is NOT undefined/null.",

  // Comparisons (computed)
  stricteq: "Compute strict equality (===) into dst.",

  // Comparisons (branching)
  jstricteq: "Jump to targetLabel if lhs === rhs.",
  jnstricteq: "Jump to targetLabel if lhs !== rhs.",
  jeq: "Jump to targetLabel if lhs == rhs (abstract equality).",
  jneq: "Jump to targetLabel if lhs != rhs (abstract inequality).",
  jless: "Jump to targetLabel if lhs < rhs.",
  jnless: "Jump to targetLabel if NOT (lhs < rhs).",
  jlesseq: "Jump to targetLabel if lhs <= rhs.",
  jnlesseq: "Jump to targetLabel if NOT (lhs <= rhs).",
  jgreater: "Jump to targetLabel if lhs > rhs.",
  jngreater: "Jump to targetLabel if NOT (lhs > rhs).",
  jgreatereq: "Jump to targetLabel if lhs >= rhs.",
  jngreatereq: "Jump to targetLabel if NOT (lhs >= rhs).",

  // Pointer comparisons (used for fast paths / sentinels)
  jeq_ptr: "Jump to targetLabel if value equals a special pointer (fast identity check).",
  jneq_ptr: "Jump to targetLabel if value does NOT equal a special pointer (fast identity check).",

  // Switch
  switch_imm: "Jump via an immediate switch jump table using scrutinee.",

  // Object / property access
  new_object: "Create a new empty object (with optional inline capacity).",
  new_array: "Create a new array from argv/argc (array literal).",
  new_array_with_spread: "Create a new array from argv/argc including spread elements.",
  new_array_buffer: "Create an array storage buffer (butterfly) from an immutable constant.",
  get_by_id: "Load a property by identifier/index from base into dst.",
  put_by_id: "Store a property by identifier/index on base (strict/direct flags may apply).",
  get_by_val: "Load a property by value (dynamic key) from base into dst.",
  define_data_property: "Define a data property with attributes on an object.",
  put_getter_setter_by_id: "Define a getter/setter pair on an object property.",
  get_length: "Load the length of an array-like value into dst.",
  get_prototype_of: "Get the prototype of a value.",
  get_by_id_with_this: "Load a method by id using an explicit thisValue (used for super/with-this access).",

  // Calls / construction
  call: "Call a function (callee) with argc/argv; store result in dst.",
  tail_call: "Tail-call a function (call without growing the stack frame).",
  call_ignore_result: "Call a function but ignore its return value.",
  construct: "Construct an object via 'new' (callee) with argc/argv.",
  super_construct: "Call the super constructor and initialize 'this'.",

  // Scopes / environments
  resolve_scope: "Resolve a variable binding in the given scope (produces a scope object/reference).",
  get_from_scope: "Load a variable from a resolved scope into dst.",
  put_to_scope: "Store a value into a resolved scope variable.",
  create_lexical_environment: "Create a new lexical environment (closure scope) with an initial value.",
  check_tdz: "Temporal Dead Zone check for an uninitialized lexical binding.",

  // Arguments / rest
  get_argument: "Load a function argument by index into dst.",
  create_cloned_arguments: "Create a (cloned) 'arguments' object.",
  get_rest_length: "Compute the rest parameter length (arguments.length - numParametersToSkip).",
  create_rest: "Create the rest parameter array.",

  // Iteration
  iterator_open: "Open an iterator for an iterable (prepare iterator/next records).",
  iterator_next: "Advance an iterator (produce done/value).",
  get_property_enumerator: "Get a property name enumerator for for-in enumeration.",
  enumerator_next: "Get the next property name from an enumerator.",
  enumerator_get_by_val: "Load obj[prop] during enumeration using the enumerator fast path.",
  spread: "Spread an iterable/array argument into a temporary list for calls/array literals.",

  // Internal fields / generators / async
  get_internal_field: "Read an internal field (internal slot) from an object.",
  put_internal_field: "Write an internal field (internal slot) on an object.",
  new_generator: "Allocate a generator object.",
  create_generator: "Create a generator instance from the current function/closure.",
  new_promise: "Allocate a new Promise object.",

  // Type checks
  is_constructor: "Check whether a value is a constructor (callable with 'new').",
  is_object: "Check whether a value is an object (and not null).",
  is_cell_with_type: "Check whether a JSCell has a specific internal runtime type.",
  is_empty: "Check whether a value is the internal 'empty' sentinel.",

  // Exceptions
  throw: "Throw an exception value.",
  throw_static_error: "Throw a VM-generated error with a static message and error type.",
  catch: "Exception handler entry; binds exception/thrownValue for a catch/finally region.",

  // Other ops / JS semantics
  instanceof: "Compute/branch for the instanceof operator.",
  in_by_val: "Compute/branch for the 'in' operator with a dynamic property key.",
  create_this: "Allocate/initialize 'this' for a constructor call.",
} as const;

export type JscOpcode = keyof typeof OPCODE_INFO;

export function getOpcodeInfo(rawToken: string | null | undefined): string | undefined {
  if (!rawToken) return undefined;

  const key = rawToken.trim();
  if (!key) return undefined;

  const normalized = key.replace(/^\*+/, "");
  return (OPCODE_INFO as Record<string, string>)[normalized];
}

const OPERAND_KEY_INFO: Record<string, string> = {
  // Common operand names
  dst: "Destination operand: where the result is written (typically a virtual register like loc5).",
  src: "Source operand: value/register to read from.",
  srcDst: "Source+destination operand: read-modify-write in place (e.g. inc srcDst:loc5).",
  scope: "Scope/environment operand used for variable resolution (lexical/global/closure).",
  var: "Variable index within the resolved scope (maps to an internal slot).",
  value: "Value operand.",
  base: "Base object for property access (e.g. base:loc8).",
  property: "Property identifier/index (often refers to an entry in the Identifiers table: idN).",
  getter: "Getter function value.",
  setter: "Setter function value.",
  callee: "Function being called/constructed.",
  lhs: "Left-hand side operand.",
  rhs: "Right-hand side operand.",
  condition: "Branch condition operand.",
  operand: "Generic operand (meaning depends on opcode).",

  // Control-flow metadata
  targetLabel: "Jump target label. The resolved bytecode offset is shown as (->N).",

  // Profiling / feedback
  valueProfile: "Value profile index used for type/value feedback (helps the JIT optimize).",
  profileIndex: "Profile index used for operation feedback (helps the JIT optimize).",
  operandTypes: "Type feedback for an operation (usually printed as OperandTypes(...)).",
  valueProfileIndex: "Value profile index used for type/value feedback.",

  // Calls / args
  argc: "Argument count passed to the call/construct.",
  argv: "Argument vector base (VM calling convention / stack offset for argv).",

  // Object creation / layout
  inlineCapacity: "Inline property capacity for a newly created object.",
  attributes: "Property attributes bitmask (writable/enumerable/configurable, etc.).",
  flags: "Extra operation flags (e.g. Strict, IsDirect).",

  // Scopes / environments / TDZ
  localScopeDepth: "Relative scope depth for a variable access (0 = current scope).",
  symbolTableOrScopeDepth: "Overloaded operand used for symbol tables or scope depth (depends on opcode).",
  offset: "Slot offset used by the operation (meaning depends on opcode).",
  functionDecl: "Function declaration index in the function table for the current compilation unit.",
  resolveType: "Binding resolution mode (e.g. GlobalProperty, ResolvedClosureVar).",
  getPutInfo: "Encoded flags describing binding resolution and get/put semantics; decoded flags follow in <...>.",
  targetVirtualRegister: "Virtual register used by the operation (e.g. for TDZ checks).",

  // Iteration / enumerators
  iterator: "Iterator record/object used by the iteration helper.",
  next: "Iterator 'next' function/value used by the iteration helper.",
  symbolIterator: "The Symbol.iterator property/function used to open an iterator.",
  iterable: "Iterable value used to open/advance an iterator.",
  done: "Destination for the iterator 'done' boolean.",
  propertyName: "Destination for the enumerated property name.",
  mode: "Enumerator mode/state used by for-in fast paths.",
  index: "Index operand (meaning depends on opcode).",
  stackOffset: "VM stack offset used by the iteration helper.",

  // Switch
  tableIndex: "Switch jump table index (see Switch Jump Tables section).",
  scrutinee: "Switch scrutinee value being matched.",

  // Internal fields / runtime
  ecmaMode: "ECMAScript mode used by the operation (e.g. StrictMode).",
  type: "Internal runtime type discriminator (used by some type checks).",
  specialPointer: "Special pointer/sentinel used by fast-path pointer checks.",
  isInternalPromise: "Whether the created Promise is an internal VM promise.",
  numParametersToSkip: "Number of formal parameters to skip (used for rest parameters).",
  arraySize: "Array size to allocate (used for rest parameters).",
  argument: "Argument operand (meaning depends on opcode).",
  bitVector: "Bit vector describing spread positions (used by some array-with-spread ops).",
  recommendedIndexingType: "JSC internal hint for array indexing strategy (implementation detail).",
  immutableButterfly: "Immutable butterfly/array storage constant (implementation detail).",
  initialValue: "Initial value used to initialize a newly created lexical environment.",
  symbolTable: "Symbol table object for a lexical environment (implementation detail).",

  // Exceptions
  message: "Error message string used for a thrown VM error.",
  errorType: "Error type to throw (e.g. TypeError, ReferenceError).",
  exception: "Caught exception value (in catch handler).",
  thrownValue: "Thrown value captured by the handler (in catch/finally).",
};

const FLAG_INFO: Record<string, string> = {
  Strict: "Strict-mode semantics apply to this operation.",
  IsDirect: "Direct property access/definition fast-path (implementation detail).",
  ThrowIfNotFound: "Throw if the resolved binding/property is not found.",
  DoNotThrowIfNotFound: "Do not throw if the binding/property is not found.",
};

const RESOLVE_TYPE_INFO: Record<string, string> = {
  GlobalProperty: "Resolve binding as a global property lookup.",
  ResolvedClosureVar: "Resolve binding as a closure (captured) variable.",
};

const ERROR_TYPE_INFO: Record<string, string> = {
  TypeError: "TypeError (used for invalid operand types or bad operations).",
  ReferenceError: "ReferenceError (used for TDZ/uninitialized bindings, invalid 'this', etc.).",
  RangeError: "RangeError (used for out-of-range numeric conditions).",
  SyntaxError: "SyntaxError (used for invalid syntax/runtime parsing invariants).",
};

const ECMA_MODE_INFO: Record<string, string> = {
  StrictMode: "Strict mode (ES5+ strict semantics).",
  SloppyMode: "Sloppy mode (non-strict semantics).",
};

const strip = (token: string) => stripEdges(token);

function describeRegister(token: string): string | undefined {
  if (token === "this") return "Implicit 'this' value for the current function/frame.";
  if (token === "callee") return "The current function object (callee).";

  const loc = token.match(/^loc(\d+)$/);
  if (loc) return `Virtual register loc${loc[1]} (local/callee-saved register slot).`;

  const arg = token.match(/^arg(\d+)$/);
  if (arg) return `Argument register arg${arg[1]} (function argument ${arg[1]}).`;

  return undefined;
}

function describeIndexRef(token: string): string | undefined {
  const m = token.match(/^(const|id|k)(\d+)$/);
  if (!m) return undefined;

  const kind = m[1];
  const idx = m[2];
  if (kind === "const") return `Reference to constant table entry const${idx} (see Constants section: k${idx} = ...).`;
  if (kind === "k") return `Constant table entry k${idx} (see Constants section).`;
  if (kind === "id") return `Identifier table entry id${idx} (see Identifiers section).`;
  return undefined;
}

function describeAngleBracket(token: string): string | undefined {
  if (!token.startsWith("<") || !token.endsWith(">")) return undefined;

  if (token === "<JSValue()>") return "JSValue placeholder (generic tagged JS value).";

  if (token.includes("|")) {
    const parts = token.slice(1, -1).split("|").filter(Boolean);
    if (parts.length) {
      const known = parts.map((p) => (FLAG_INFO[p] ? `${p} — ${FLAG_INFO[p]}` : undefined)).filter(Boolean) as string[];
      if (known.length) return known.join("\n");
      return `Decoded flags: ${parts.join(" | ")}.`;
    }
  }

  return "JSC metadata/decoded flags (implementation detail).";
}

function describeKeyValueToken(token: string): string | undefined {
  const m = token.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:(.*)$/);
  if (!m) return undefined;

  const key = m[1];
  const rawValue = m[2] ?? "";
  const value = strip(rawValue.trim());

  const keyInfo =
    OPERAND_KEY_INFO[key] ??
    (key.endsWith("ValueProfile")
      ? "Value profile index used for type/value feedback (helps the JIT optimize)."
      : key.endsWith("Profile") || key.endsWith("ProfileIndex")
        ? "Profile index used for feedback (helps the JIT optimize)."
        : undefined);
  if (!keyInfo) return undefined;

  if (!value) return keyInfo;

  if (key === "resolveType" && RESOLVE_TYPE_INFO[value]) return `${keyInfo}\n${value} — ${RESOLVE_TYPE_INFO[value]}`;
  if (key === "errorType" && ERROR_TYPE_INFO[value]) return `${keyInfo}\n${value} — ${ERROR_TYPE_INFO[value]}`;
  if (key === "ecmaMode" && ECMA_MODE_INFO[value]) return `${keyInfo}\n${value} — ${ECMA_MODE_INFO[value]}`;
  if (key === "property" && /^\d+$/.test(value)) return `${keyInfo}\nIndex: ${value}`;
  if (
    (key.endsWith("ValueProfile") || key.endsWith("Profile") || key.endsWith("ProfileIndex")) &&
    /^-?\d+$/.test(value)
  )
    return `${keyInfo}\nIndex: ${value}`;
  if ((key === "argc" || key === "argv") && /^\d+$/.test(value)) return `${keyInfo}\nValue: ${value}`;
  if (key === "targetLabel" && /^-?\d+$/.test(value)) return `${keyInfo}\nLabel: ${value}`;

  if (key === "src" && value === "Undefined") return `${keyInfo}\nUndefined — the JavaScript 'undefined' value.`;
  if (key === "src" && value === "Null") return `${keyInfo}\nNull — the JavaScript 'null' value.`;
  if (key === "src" && value === "True") return `${keyInfo}\nTrue — boolean true.`;
  if (key === "src" && value === "False") return `${keyInfo}\nFalse — boolean false.`;

  const reg = describeRegister(value);
  if (reg) return `${keyInfo}\nValue: ${value}\n${reg}`;

  const idx = describeIndexRef(value);
  if (idx) return `${keyInfo}\nValue: ${value}\n${idx}`;

  return `${keyInfo}\nValue: ${value}`;
}

const LITERALS: Record<string, string> = {
  "->": "Resolved jump arrow to the target bytecode offset shown next.",
  Undefined: "JavaScript 'undefined' value.",
  Null: "JavaScript 'null' value.",
  True: "Boolean true.",
  False: "Boolean false.",
  Int32: "32-bit integer constant marker in JSC disassembly.",
  String: "String constant marker in JSC disassembly.",
  Cell: "JSC internal heap cell (pointer-tagged) marker in disassembly.",
  Object: "Object constant marker in JSC disassembly.",
  OperandTypes: "Type feedback tuple used by JSC for optimizing operations.",
};

function describePattern(key: string): string | undefined {
  if (/^#\d+$/.test(key)) return `Basic-block reference ${key}.`;
  if (/^0x[0-9A-Fa-f]+$/.test(key)) return "Hex address/pointer printed by the JSC disassembler.";
  return undefined;
}

export const describeToken: TokenDescriber = createDescriber({
  strip,
  steps: [
    getOpcodeInfo,
    { joinNext: describeKeyValueToken },
    describeKeyValueToken,
    describeRegister,
    describeIndexRef,
    describeAngleBracket,
    fromTable(FLAG_INFO),
    fromTable(RESOLVE_TYPE_INFO),
    fromTable(ERROR_TYPE_INFO),
    fromTable(ECMA_MODE_INFO),
    fromLiterals(LITERALS),
    describePattern,
  ],
});
