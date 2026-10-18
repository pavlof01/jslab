import { PRINT_BYTECODE_FLAG, TRACE_DEOPT_FLAG } from "./v8Flags";
import { V8_NATIVES_FLAG } from "./v8Intrinsics";

export const samples = {
  add: `function f(x){ return x + 1 }\nf(41);`,
  closure: `function f(a){ function g(b){ return a + b } return g(1) }\nf(41);`,
  loop: `function f(n){ let s=0; for(let i=0;i<n;i++) s+=i; return s }\nf(10);`,
  try: `function f(){ try { throw 1 } catch(e){ return e + 1 } }\nf();`,
  d8Native: `function hot(x){ return x + 1; }\nfor (let i = 0; i < 5000; i++) hot(i);\nif (typeof globalThis.d8 !== "undefined") {\n  try { eval('%PrepareFunctionForOptimization(hot); %OptimizeFunctionOnNextCall(hot);'); } catch {}\n}\nprint('hot(41)=', hot(41));`,
  typedarray: `const buffer = new ArrayBuffer(16);\nconst view = new DataView(buffer);\nview.setUint32(0, 0xdeadbeef, true);\nview.setFloat64(8, Math.PI, true);\nconst bytes = Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0'));\nprint('buffer bytes:', bytes.join(' '));\nprint('float64:', view.getFloat64(8, true).toFixed(6));`,
  asyncFlow: `async function loadUser(id){\n  return { id, name: 'user-' + id };\n}\nasync function main(){\n  const users = await Promise.all([1, 2, 3].map((id) => loadUser(id)));\n  const names = users.map((u) => u.name).join(', ');\n  print('async users:', names);\n}\nmain();`,
  generator: `function* fibonacci(limit){\n  let a = 0, b = 1;\n  while (limit-- > 0) {\n    yield a;\n    [a, b] = [b, a + b];\n  }\n}\nprint('fib:', [...fibonacci(8)].join(', '));`,
};

export type SampleKey = keyof typeof samples;
export type SampleDescriptor = { key: SampleKey; label: string; description: string };

export const sampleCatalog: SampleDescriptor[] = [
  { key: "add", label: "Add", description: "Minimal function call returning 42." },
  {
    key: "closure",
    label: "Closure",
    description: "Capturing outer scope and invoking inner function.",
  },
  { key: "loop", label: "Loop", description: "Simple for-loop summing integer range." },
  {
    key: "try",
    label: "Try/catch",
    description: "Exception handling flow returning a computed value.",
  },
  {
    key: "d8Native",
    label: "d8 native",
    description: "Uses V8 % intrinsics to optimise a hot function.",
  },
  {
    key: "typedarray",
    label: "Typed arrays",
    description: "Manipulates ArrayBuffer via DataView, prints bytes.",
  },
  {
    key: "asyncFlow",
    label: "Async flow",
    description: "Async/await fetching mock users in parallel.",
  },
  {
    key: "generator",
    label: "Generator",
    description: "Generates Fibonacci numbers via iterator.",
  },
];

// ---------------------------------------------------------------------------
// V8 Internals examples
// ---------------------------------------------------------------------------

export const v8Samples = {
  smiVsHeap: `// TOPIC: Number Representation — Smi vs HeapNumber

function numberStudy() {
  let val = 42;
  // A small integer: V8 stores it as a Smi, inside the tagged value itself
  %DebugPrint(val);

  /* @annotation
  match: Smi: 0x2a (42)
  highlight: Smi: 0x2a
  title: Smi
  text: 0x2a is 42 encoded right in the tagged value. No heap object exists for this number.
  */

  val = val + 0.5;
  // 42.5 has no Smi encoding, so V8 allocates a HeapNumber for it
  %DebugPrint(val);

  /* @annotation
  match: [HeapNumber]
  highlight: HeapNumber
  title: HeapNumber
  text: A separate heap object that holds a 64-bit float. The variable now points at it.
  */

  /* @annotation
  match: - value: 42.5
  highlight: 42.5
  title: The boxed value
  text: The float stored inside the HeapNumber.
  */

  val = 100;
  // An integer again: the local variable simply holds the Smi 100
  %DebugPrint(val);

  /* @annotation
  match: Smi: 0x64 (100)
  highlight: Smi: 0x64
  title: Back to a Smi
  text: A local variable does not keep the old box: assigning an integer stores a Smi, and the HeapNumber is left for the garbage collector.
  */
}

numberStudy();

/*
CONCLUSION:
Smis (31-bit signed integers, roughly ±1 billion) live inside the tagged
value: no allocation, no GC pressure. Any other number becomes a HeapNumber,
a heap object reached through a pointer.
*/`,

  arrayLengthHoley: `// TOPIC: Array Element Kinds — PACKED to HOLEY via length mutation

const arr = [1, 2, 3];
// PACKED_SMI_ELEMENTS: contiguous memory, all slots filled
%DebugPrint(arr);

/* @annotation
match: elements kind: PACKED_SMI_ELEMENTS
highlight: PACKED_SMI_ELEMENTS
title: PACKED_SMI_ELEMENTS
text: Every array index is filled with a small integer.
*/

/* @annotation
match: elements kind: HOLEY_SMI_ELEMENTS
highlight: HOLEY_SMI_ELEMENTS
title: PACKED_SMI_ELEMENTS → HOLEY_SMI_ELEMENTS
text: Growing length creates the missing indexes 3–9, so V8 switches the array representation from packed to holey.
*/
arr.length = 10;
// HOLEY_SMI_ELEMENTS: 7 empty slots created. Reading a hole makes V8 check
// the prototype chain — slower than PACKED.
%DebugPrint(arr);

// arr[5] = 100;
// Uncomment: fills one hole — array stays HOLEY but index 5 becomes defined

/*
CONCLUSION:
Setting arr.length beyond its current size creates "holes" and permanently
transitions the array from PACKED to HOLEY. PACKED arrays are faster because
V8 can skip prototype-chain checks on every element access.
*/`,

  arrayTypeTransitions: `// TOPIC: Array Element Kinds — Irreversible Type Cascade

const arr = [1, 2, 3];
// Only small integers: every element is a Smi
%DebugPrint(arr);

/* @annotation
match: elements kind: PACKED_SMI_ELEMENTS
highlight: PACKED_SMI_ELEMENTS
title: PACKED_SMI_ELEMENTS
text: The most specific kind: every element is a Smi.
*/

arr.push(4.5);
// A float joins: V8 rewrites the backing store as raw 64-bit doubles
%DebugPrint(arr);

/* @annotation
match: elements kind: PACKED_DOUBLE_ELEMENTS
highlight: PACKED_DOUBLE_ELEMENTS
title: PACKED_DOUBLE_ELEMENTS
text: The numbers now sit unboxed in a FixedDoubleArray, 8 bytes each, with no HeapNumber objects.
*/

arr.push({ x: 1 });
// An object joins: the backing store holds generic tagged values
%DebugPrint(arr);

/* @annotation
match: elements kind: PACKED_ELEMENTS
highlight: PACKED_ELEMENTS
title: PACKED_ELEMENTS
text: The most general kind: any value can go in any slot.
*/

/* @annotation
match: <HeapNumber 1.0>
highlight: HeapNumber 1.0
title: Doubles are boxed again
text: A generic FixedArray cannot hold raw doubles, so every number became a HeapNumber — even 1, which started out as a Smi.
*/

// arr.push("hello");
// Uncomment: no change — the array is already at the most general kind

/*
CONCLUSION:
Element kinds only move towards more general ones: SMI → DOUBLE → generic.
V8 never moves an array back by itself, even if the float or the object is
removed later. Keep arrays homogeneous to keep their tight representation.
*/`,

  arrayDeleteVsUndefined: `// TOPIC: Array Holes — delete vs Assigning undefined

const a = ["a", "b", "c"];
delete a[1];
// delete removes the element: index 1 becomes a hole
%DebugPrint(a);

/* @annotation
match: elements kind: HOLEY_ELEMENTS
highlight: HOLEY_ELEMENTS
title: delete punched a hole
text: Index 1 holds the hole marker now, so the array became HOLEY. Reading a hole falls through to the prototype chain.
*/

const b = ["a", "b", "c"];
b[1] = undefined;
// Assigning undefined stores a real value: the array stays PACKED
%DebugPrint(b);

/* @annotation
match: elements kind: PACKED_ELEMENTS
highlight: PACKED_ELEMENTS
title: undefined is a value
text: The slot still holds an element — it just happens to be undefined. No hole, no transition.
*/

print(1 in a, 1 in b);

/* @annotation
match: false true
highlight: false
title: 1 in a
text: The hole is not an element, so the in operator reports false.
*/

/* @annotation
match: false true
highlight: true
title: 1 in b
text: Index 1 exists and holds undefined.
*/

// const c = [1, 2, 3];
// c[1] = undefined;
// %DebugPrint(c);
// Uncomment: with numbers the same assignment gives HOLEY_DOUBLE_ELEMENTS.
// V8 14 keeps the array as raw doubles and needs the HOLEY kind to mark undefined.

/*
CONCLUSION:
'delete arr[i]' leaves a hole and makes the array HOLEY. Assigning undefined
keeps a real element in the slot. They read the same in userland but differ
inside V8 — and for number arrays, even undefined costs the PACKED kind.
*/`,

  arrayDictionaryMode: `// TOPIC: Array Element Kinds — Sparse Array and Dictionary Mode

const arr = [1, 2, 3];
// A small contiguous backing store with 3 slots
%DebugPrint(arr);

/* @annotation
match: elements kind: PACKED_SMI_ELEMENTS
highlight: PACKED_SMI_ELEMENTS
title: Flat and full
text: Three Smis in a contiguous backing store.
*/

arr[1000] = 99;
// Still worth a flat array: V8 grows the store and leaves 997 holes
%DebugPrint(arr);

/* @annotation
match: elements kind: HOLEY_SMI_ELEMENTS
highlight: HOLEY_SMI_ELEMENTS
title: Flat with holes
text: Indexes 3–999 are holes, but a flat array is still cheaper than a hash table at this size.
*/

arr[100000] = 1;
// Too sparse: V8 switches the elements to a hash table
%DebugPrint(arr);

/* @annotation
match: elements kind: DICTIONARY_ELEMENTS
highlight: DICTIONARY_ELEMENTS
title: Dictionary mode
text: Keeping 100,000 slots for 5 values would waste memory, so the elements moved into a NumberDictionary.
*/

/* @annotation
match: <NumberDictionary
highlight: NumberDictionary
title: Hash table
text: Index lookups are hash-table lookups now instead of a direct offset.
*/

/*
CONCLUSION:
When an array gets too sparse V8 abandons the contiguous backing store and
falls back to dictionary (hash table) mode. This saves memory at the cost of
turning every index access into a hash lookup.
*/`,

  hiddenClassOrder: `// TOPIC: Hidden Classes — Property Insertion Order Matters

function makeXY() {
  const o = {};
  o.x = 1;
  o.y = 2;
  return o;
}

function makeYX() {
  const o = {};
  o.y = 2;
  o.x = 1;
  return o;
}

const a = makeXY();
const b = makeYX();
const c = makeXY();

// Same properties, same values — but a different insertion order
print("a and b share a map:", %HaveSameMap(a, b));
// Same order as a: c reuses a's hidden class
print("a and c share a map:", %HaveSameMap(a, c));

/* @annotation
match: a and b share a map: false
highlight: false
title: Different hidden classes
text: Adding x then y builds a different chain of maps than adding y then x.
*/

/* @annotation
match: a and c share a map: true
highlight: true
title: Shared hidden class
text: The same insertion order walks the same map transitions, so a and c end up with one Map.
*/

%DebugPrint(a);
%DebugPrint(b);

/* @annotation
match: #x: 1 (const data field 3
highlight: field 3
title: x in a
text: In a, x is the first property, stored in the first in-object field.
*/

/* @annotation
match: #x: 1 (const data field 4
highlight: field 4
title: x in b
text: In b, x was added second, so it sits one field later. Code specialised for a's layout would read the wrong slot here — that is why the maps differ.
*/

/*
CONCLUSION:
V8 builds hidden classes (Maps) along property-addition paths. Objects with
the same properties added in a different order get different Maps, which
keeps call sites that see both from staying monomorphic.
*/`,

  hiddenClassDelete: `// TOPIC: Hidden Classes — delete Forces Dictionary Mode

const obj = { a: 1, b: 2, c: 3 };
// Fast properties: every field sits at a fixed offset described by the Map
%DebugPrint(obj);

/* @annotation
match: [FastProperties]
highlight: FastProperties
title: Fast properties
text: The Map describes where each property lives, so a load is a direct read at a known offset.
*/

delete obj.b;
// The Map can no longer describe the layout: V8 moves the object to a dictionary
%DebugPrint(obj);

/* @annotation
match: [DictionaryProperties]
highlight: DictionaryProperties
title: Dictionary (slow) properties
text: The properties now live in a hash table. Every access is a lookup, and inline caches cannot use a fixed offset.
*/

/* @annotation
match: a: 1 (data, dict_index
highlight: dict_index
title: Hash-table entry
text: Compare with "const data field" above: a is a dictionary entry now, not a field.
*/

// obj.b = 99;
// %DebugPrint(obj);
// Uncomment: re-adding b does not bring fast properties back — V8 does not
// switch the object back on its own.

/*
CONCLUSION:
'delete' takes the object off its hidden class and into dictionary (slow)
mode for all of its properties. Prefer assigning null or undefined — the
property stays in the shape and keeps the fast path.
*/`,

  bytecodeDestructuring: `// TOPIC: Bytecode — Array Destructuring vs Direct Index Access

function fastStudy(arr) {
  // Direct index access: one GetKeyedProperty instruction per element
  const a = arr[0];
  const b = arr[1];
  return a + b;
}

function slowStudy(arr) {
  // The full ECMAScript iterator protocol:
  // 1. GetIterator — calls arr[Symbol.iterator]()
  // 2. a .next() call for each binding
  // 3. a check of 'done' on every result object
  // 4. an implicit try/finally that closes the iterator
  const [a, b] = arr;
  return a + b;
}

const data = [1, 2];
fastStudy(data);
slowStudy(data);

/* @annotation
match: function: fastStudy
highlight: fastStudy
title: Direct index access
text: Two GetKeyedProperty loads, an Add and a Return — the whole function.
*/

/* @annotation
match: function: slowStudy
highlight: slowStudy
title: Destructuring
text: GetIterator, a .next() call and a done check per binding, then the code that closes the iterator. Compare the length with fastStudy.
*/

/*
CONCLUSION:
Array destructuring is not syntax sugar for index access — it runs the
iterator protocol. In V8 14.9 fastStudy compiles to 9 bytecode instructions,
slowStudy to 83 plus a handler table for the implicit try/finally.
*/`,

  consString: `// TOPIC: String Representation — ConsString (Lazy Concatenation)

function stringStudy() {
  const s1 = "Visualizing V8 internals is fun";
  const s2 = " and very educational.";

  // V8 does not copy characters here: it creates a ConsString, a node that
  // points at s1 and s2. The concatenation is O(1).
  const combined = s1 + s2;
  %DebugPrint(combined);

  /* @annotation
  match: type: CONS_ONE_BYTE_STRING_TYPE
  highlight: CONS_ONE_BYTE_STRING_TYPE
  title: ConsString
  text: A node with two child pointers. The characters of s1 and s2 were not copied.
  */

  // Short results are copied straight away: a ConsString only pays off for
  // strings of 13 characters or more
  const short = s1.slice(0, 3) + "!";
  %DebugPrint(short);

  /* @annotation
  match: type: SEQ_ONE_BYTE_STRING_TYPE
  highlight: SEQ_ONE_BYTE_STRING_TYPE
  title: Flat string
  text: "Vis!" is too short for a ConsString, so V8 copied the characters into one sequential string.
  */

  // combined.indexOf("fun");
  // Uncomment: many operations need a flat buffer and "flatten" the
  // ConsString first, paying the O(n) copy only once it is needed.
}

stringStudy();

/*
CONCLUSION:
V8's ConsString makes long concatenations cheap: '+' links two strings
instead of copying them. The copy is deferred until an operation needs a
flat buffer, such as RegExp, indexOf or substring.
*/`,

  deoptTypeChange: `// TOPIC: Deoptimization — Type Assumption Violation

function add(x) {
  return x + 1;
}

%PrepareFunctionForOptimization(add);
// Warm-up: add only ever sees small integers, so its feedback says "x is a Smi"
for (let i = 0; i < 100; i++) add(i);

%OptimizeFunctionOnNextCall(add);
add(1);
print("optimized:", %ActiveTierIsTurbofan(add));

/* @annotation
match: optimized: true
highlight: true
title: TurboFan code
text: add now runs as machine code that assumes x is a Smi.
*/

add("hello");
// A string breaks the assumption: the optimized code bails out
print("optimized after a string:", %ActiveTierIsTurbofan(add));

/* @annotation
match: kind: deopt-eager
highlight: deopt-eager
title: Eager deopt
text: A type check inside the optimized code failed, so execution jumped back to the interpreter on the spot.
*/

/* @annotation
match: reason: not a Smi
highlight: not a Smi
title: Why it bailed out
text: The code was specialised for the Smis seen during warm-up; "hello" is not one.
*/

/* @annotation
match: optimized after a string: false
highlight: false
title: Back in the interpreter
text: The optimized code was thrown away. V8 may optimize add again later, this time for numbers and strings.
*/

/*
CONCLUSION:
Optimizing compilers speculate on the types they have observed. A value
outside that set causes a deopt — a bail-out to the interpreter that throws
the optimized code away. Keep hot functions type-stable.
*/`,

  icMonomorphic: `// TOPIC: Inline Caches — Monomorphic vs Polymorphic

function readX(o) {
  return o.x;
}

%PrepareFunctionForOptimization(readX);
const a = { x: 1, y: 2 };
// Every call sees the same hidden class: the inline cache for o.x is monomorphic
readX(a);
readX(a);

%OptimizeFunctionOnNextCall(readX);
readX(a);
// TurboFan compiles o.x into "check the map, then load the field"
print("optimized for one shape:", %ActiveTierIsTurbofan(readX));

const b = { x: 3, z: 4 };
print("a and b share a map:", %HaveSameMap(a, b));

readX(b);
// The map check fails: the code deopts and the inline cache learns a second shape
print("still optimized:", %ActiveTierIsTurbofan(readX));

/* @annotation
match: optimized for one shape: true
highlight: true
title: Monomorphic
text: One shape seen, so the optimized code checks a single map and reads x at a fixed offset.
*/

/* @annotation
match: a and b share a map: false
highlight: false
title: A second shape
text: b has x too, but its own hidden class.
*/

/* @annotation
match: reason: wrong map
highlight: wrong map
title: Map check failed
text: The code was built for a's map only. b is a different map, so V8 deoptimizes.
*/

/* @annotation
match: still optimized: false
highlight: false
title: Polymorphic from now on
text: The inline cache now holds two maps. If V8 optimizes readX again, it checks both.
*/

// readX({ x: 5, w: 6 });
// readX({ x: 7, v: 8 });
// readX({ x: 9, u: 10 });
// Uncomment: beyond four shapes the inline cache goes megamorphic and V8
// stops caching shapes at this site, falling back to a generic lookup.

/*
CONCLUSION:
Inline caches record which object shapes a site sees, and optimized code is
specialised for them. One shape (monomorphic) is fastest, a few
(polymorphic) cost a chain of checks, and many (megamorphic) fall back to a
generic lookup. A new shape in optimized code means a "wrong map" deopt.
*/`,

  argumentsVsRest: `// TOPIC: Bytecode — arguments Object vs Rest Parameters

function sumArguments() {
  // 'arguments' is the legacy array-like object. In sloppy mode it is
  // "mapped": its indexes alias the named parameters.
  let s = 0;
  for (let i = 0; i < arguments.length; i++) s += arguments[i];
  return s;
}

function sumRest(...args) {
  // 'args' is a plain Array holding the surplus arguments
  let s = 0;
  for (let i = 0; i < args.length; i++) s += args[i];
  return s;
}

sumArguments(1, 2, 3);
sumRest(1, 2, 3);

/* @annotation
match: CreateMappedArguments
title: Mapped arguments object
text: Allocates the sloppy-mode arguments object, which may alias named parameters. That aliasing is what makes it harder to optimize.
*/

/* @annotation
match: CreateRestParameter
title: Rest parameter
text: Allocates an ordinary Array with the surplus arguments. Nothing aliases it.
*/

/*
CONCLUSION:
The two functions compile to almost the same bytecode: the loops match
instruction for instruction and only the first instruction differs. The cost
of 'arguments' is not bytecode length but its legacy semantics — the mapped
object aliases parameters in sloppy mode, which gets in the way of
optimization. Rest parameters are an ordinary Array; prefer them.
*/`,
};

export type V8SampleKey = keyof typeof v8Samples;
export type V8SampleDescriptor = {
  key: V8SampleKey;
  label: string;
  description: string;
  flags: readonly string[];
};

export const v8SampleCatalog: V8SampleDescriptor[] = [
  {
    key: "smiVsHeap",
    label: "Smi vs HeapNumber",
    description: "Number boxing: when integers escape to the heap.",
    flags: [V8_NATIVES_FLAG],
  },
  {
    key: "arrayLengthHoley",
    label: "Length → Holey",
    description: "Setting arr.length creates holes: PACKED → HOLEY.",
    flags: [V8_NATIVES_FLAG],
  },
  {
    key: "arrayTypeTransitions",
    label: "Element Kind Cascade",
    description: "One-way ratchet: SMI → DOUBLE → OBJECT elements.",
    flags: [V8_NATIVES_FLAG],
  },
  {
    key: "arrayDeleteVsUndefined",
    label: "delete vs undefined",
    description: "Two ways to clear a slot — only one punches a hole.",
    flags: [V8_NATIVES_FLAG],
  },
  {
    key: "arrayDictionaryMode",
    label: "Dictionary Mode",
    description: "Sparse arrays switch from flat memory to a hash table.",
    flags: [V8_NATIVES_FLAG],
  },
  {
    key: "hiddenClassOrder",
    label: "Hidden Class Order",
    description: "Property insertion order determines object shape (Map).",
    flags: [V8_NATIVES_FLAG],
  },
  {
    key: "hiddenClassDelete",
    label: "delete → Slow Props",
    description: "Deleting a property invalidates the hidden class chain.",
    flags: [V8_NATIVES_FLAG],
  },
  {
    key: "bytecodeDestructuring",
    label: "Destructuring Bytecode",
    description: "Array destructuring vs index access: bytecode cost.",
    flags: [PRINT_BYTECODE_FLAG],
  },
  {
    key: "consString",
    label: "ConsString",
    description: "String concatenation defers character copying lazily.",
    flags: [V8_NATIVES_FLAG],
  },
  {
    key: "deoptTypeChange",
    label: "Deoptimization",
    description: "Passing an unexpected type bails out of optimized code.",
    flags: [V8_NATIVES_FLAG, TRACE_DEOPT_FLAG],
  },
  {
    key: "icMonomorphic",
    label: "Inline Caches",
    description: "Optimized code trusts the shapes it has seen; a new one deopts it.",
    flags: [V8_NATIVES_FLAG, TRACE_DEOPT_FLAG],
  },
  {
    key: "argumentsVsRest",
    label: "arguments vs Rest",
    description: "Same loop, different first instruction: mapped arguments vs a rest Array.",
    flags: [PRINT_BYTECODE_FLAG],
  },
];
