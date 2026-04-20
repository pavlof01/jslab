export const samples = {
  add: `function f(x){ return x + 1 }\nf(41);`,
  closure: `function f(a){ function g(b){ return a + b } return g(1) }\nf(41);`,
  loop: `function f(n){ let s=0; for(let i=0;i<n;i++) s+=i; return s }\nf(10);`,
  try: `function f(){ try { throw 1 } catch(e){ return e + 1 } }\nf();`,
  d8Native: `function hot(x){ return x + 1; }\nfor (let i = 0; i < 5000; i++) hot(i);\nif (typeof globalThis.d8 !== "undefined") {\n  try { eval('%OptimizeFunctionOnNextCall(hot);'); } catch {}\n}\nprint('hot(41)=', hot(41));`,
  typedarray: `const buffer = new ArrayBuffer(16);\nconst view = new DataView(buffer);\nview.setUint32(0, 0xdeadbeef, true);\nview.setFloat64(8, Math.PI, true);\nconst bytes = Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0'));\nprint('buffer bytes:', bytes.join(' '));\nprint('float64:', view.getFloat64(8, true).toFixed(6));`,
  asyncFlow: `async function loadUser(id){\n  return { id, name: 'user-' + id };\n}\nasync function main(){\n  const users = await Promise.all([1, 2, 3].map((id) => loadUser(id)));\n  const names = users.map((u) => u.name).join(', ');\n  print('async users:', names);\n}\nmain();`,
  generator: `function* fibonacci(limit){\n  let a = 0, b = 1;\n  while (limit-- > 0) {\n    yield a;\n    [a, b] = [b, a + b];\n  }\n}\nprint('fib:', [...fibonacci(8)].join(', '));`,
};

export type SampleKey = keyof typeof samples;
export type SampleDescriptor = { key: SampleKey; label: string; description: string };

export const sampleCatalog: SampleDescriptor[] = [
  { key: "add", label: "Add", description: "Minimal function call returning 42." },
  { key: "closure", label: "Closure", description: "Capturing outer scope and invoking inner function." },
  { key: "loop", label: "Loop", description: "Simple for-loop summing integer range." },
  { key: "try", label: "Try/catch", description: "Exception handling flow returning a computed value." },
  { key: "d8Native", label: "d8 native", description: "Uses V8 % intrinsics to optimise a hot function." },
  { key: "typedarray", label: "Typed arrays", description: "Manipulates ArrayBuffer via DataView, prints bytes." },
  { key: "asyncFlow", label: "Async flow", description: "Async/await fetching mock users in parallel." },
  { key: "generator", label: "Generator", description: "Generates Fibonacci numbers via iterator." },
];

// ---------------------------------------------------------------------------
// V8 Internals examples
// ---------------------------------------------------------------------------

export const v8Samples = {
  smiVsHeap: `// TOPIC: Number Representation — Smi vs HeapNumber
// RUN: node --allow-natives-syntax index.js

function numberStudy() {
  let val = 42;
  // Smi (Small Integer): stored directly in the pointer, zero heap allocation
  %DebugPrint(val);

  val = val + 0.5;
  // Now a HeapNumber: V8 allocates a 64-bit float object on the heap
  %DebugPrint(val);

  // val = 100;
  // Uncomment: after becoming a HeapNumber, re-assigning an integer may
  // reuse the existing heap box rather than returning to Smi
}

numberStudy();

/*
CONCLUSION:
Smi values (small integers, roughly ±1 billion) live directly in the pointer —
no allocation, no GC pressure. Once a number becomes a float (HeapNumber)
it lives on the heap, adding pointer indirection on every access.
*/`,

  arrayLengthHoley: `// TOPIC: Array Element Kinds — PACKED to HOLEY via length mutation
// RUN: node --allow-natives-syntax index.js

const arr = [1, 2, 3];
// PACKED_SMI_ELEMENTS: contiguous memory, all slots filled
%DebugPrint(arr);

arr.length = 10;
// HOLEY_SMI_ELEMENTS: 7 empty slots created. V8 must check each slot
// against the prototype chain during iteration — slower than PACKED.
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
// RUN: node --allow-natives-syntax index.js

const arr = [1, 2, 3];
// PACKED_SMI_ELEMENTS: optimal — unboxed 31-bit integers
%DebugPrint(arr);

arr.push(4.5);
// PACKED_DOUBLE_ELEMENTS: all elements re-boxed as 64-bit floats.
// This transition is one-way — removing 4.5 later won't revert it.
%DebugPrint(arr);

arr.push({ x: 1 });
// PACKED_ELEMENTS: stores generic tagged pointers.
// Most permissive kind — type-based loop optimizations no longer apply.
%DebugPrint(arr);

// arr.push("hello");
// Uncomment: no change — already at the most generic element kind

/*
CONCLUSION:
Element kind transitions are a one-way ratchet: Smi → Double → Object.
V8 never reverses them automatically. Keep arrays homogeneous to preserve
tight element representations and enable fast inner-loop optimizations.
*/`,

  arrayDeleteVsUndefined: `// TOPIC: Array Holes — delete vs Assigning undefined
// RUN: node --allow-natives-syntax index.js

const a = [1, 2, 3];
delete a[1];
// Creates a real "hole" — transitions to HOLEY_SMI_ELEMENTS.
// The slot is absent from the backing store; length stays 3.
%DebugPrint(a);

const b = [1, 2, 3];
b[1] = undefined;
// Stores the value undefined at index 1 — array stays PACKED.
// The slot exists and holds a reference to the undefined value.
%DebugPrint(b);

// console.log(1 in a, 1 in b);
// Uncomment: prints false vs true — the 'in' operator reveals the difference

/*
CONCLUSION:
'delete arr[i]' punches a real hole into the backing store and forces HOLEY
mode. Assigning undefined keeps the slot and preserves PACKED mode. They look
identical in userland but carry very different internal representations.
*/`,

  arrayDictionaryMode: `// TOPIC: Array Element Kinds — Sparse Array and Dictionary Mode
// RUN: node --allow-natives-syntax index.js

const arr = [1, 2, 3];
// PACKED_SMI_ELEMENTS: small contiguous backing store (3 slots)
%DebugPrint(arr);

arr[1000] = 99;
// HOLEY_SMI_ELEMENTS: V8 tries a flat array with 997 implicit holes
%DebugPrint(arr);

arr[100000] = 1;
// DICTIONARY_ELEMENTS: too sparse to justify flat memory.
// V8 switches to a hash table — index access is now a hash lookup
// instead of O(1) pointer arithmetic.
%DebugPrint(arr);

/*
CONCLUSION:
When an array becomes extremely sparse V8 abandons the contiguous backing
store and falls back to dictionary (hash table) mode. This saves memory
at the cost of turning O(1) index access into a hash lookup per element.
*/`,

  hiddenClassOrder: `// TOPIC: Hidden Classes — Property Insertion Order Matters
// RUN: node --allow-natives-syntax index.js

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

// false: same properties, same values — but different insertion order
// means different hidden classes (Maps) were generated
print(%HaveSameMap(a, b));

%DebugPrint(a);
%DebugPrint(b);

// const c = makeXY();
// Uncomment + print(%HaveSameMap(a, c)) → true: same order = shared Map

/*
CONCLUSION:
V8 creates a new hidden class on each unique property-addition sequence.
Objects with identical properties but different insertion orders get separate
Maps, which prevents call sites from staying monomorphic (IC fast path).
*/`,

  hiddenClassDelete: `// TOPIC: Hidden Classes — delete Forces Dictionary Mode
// RUN: node --allow-natives-syntax index.js

const obj = { a: 1, b: 2, c: 3 };
// Fast properties: fixed-offset layout, direct field access
%DebugPrint(obj);

delete obj.b;
// The hidden class chain is invalidated.
// V8 moves the object to "slow properties" (dictionary mode) —
// all further property accesses become hash-table lookups.
%DebugPrint(obj);

// obj.b = 99;
// Uncomment: re-adding the property does NOT restore fast mode.
// Once in dictionary mode, the object stays there permanently.

/*
CONCLUSION:
'delete' invalidates the object's hidden class and forces slow (dictionary)
mode for all remaining property accesses. Prefer assigning null or undefined
over deleting — the property stays in the shape and keeps fast-path access.
*/`,

  bytecodeDestructuring: `// TOPIC: Bytecode — Array Destructuring vs Direct Index Access
// RUN: node --print-bytecode --print-bytecode-filter=*Study index.js

function fastStudy(arr) {
  // Direct property access: one LdaKeyedProperty bytecode per element
  const a = arr[0];
  const b = arr[1];
  return a + b;
}

function slowStudy(arr) {
  // Full ECMAScript Iterator Protocol:
  // 1. GetIterator — calls arr[Symbol.iterator]()
  // 2. IteratorNext — calls .next() for each binding
  // 3. Checks 'done' on the result object each time
  // 4. Wraps the whole sequence in an implicit try-catch for cleanup
  const [a, b] = arr;
  return a + b;
}

const data = [1, 2];
fastStudy(data);
slowStudy(data);

/*
CONCLUSION:
Array destructuring is not syntax sugar for index access — it implements
the full ECMAScript iterator protocol. This generates significantly more
bytecode: iterator creation, repeated .next() calls, 'done' checks, and
an implicit try-catch for iterator finalization.
*/`,

  consString: `// TOPIC: String Representation — ConsString (Lazy Concatenation)
// RUN: node --allow-natives-syntax index.js

function stringStudy() {
  const s1 = "Visualizing V8 internals is fun";
  const s2 = " and very educational.";

  // V8 does NOT copy characters here.
  // It creates a ConsString: a heap node with two child pointers (s1, s2).
  // The concatenation is O(1) — no character copying happens yet.
  const combined = s1 + s2;
  %DebugPrint(combined);

  // combined.trim();
  // Uncomment: many string operations force V8 to "flatten" the ConsString
  // into one contiguous block, paying the O(n) copy cost only when needed.
}

stringStudy();

/*
CONCLUSION:
V8's ConsString makes repeated string concatenation cheap: each '+' just
links two pointers. The actual character copy is deferred (lazy) until an
operation requires a flat buffer, such as RegExp, indexOf, or substring.
*/`,

  deoptTypeChange: `// TOPIC: Deoptimization — Type Assumption Violation
// RUN: node --allow-natives-syntax --trace-deopt index.js

function add(x) {
  return x + 1;
}

// Warmup: V8 profiles the call site and sees only integer inputs.
// It compiles an optimized version assuming x is always a Smi or HeapNumber.
for (let i = 0; i < 10000; i++) add(i);

%OptimizeFunctionOnNextCall(add);
add(1);
// add is now JIT-compiled for numbers.
// Check: console.log(%GetOptimizationStatus(add))

add("hello");
// Type assumption violated — x is a string.
// V8 deoptimizes: bails out to the interpreter and discards the
// optimized code. The function may be recompiled with broader assumptions.

/*
CONCLUSION:
JIT compilers speculate on observed types. Passing a value outside the
profiled type set causes a "deopt" — a costly bail-out to the interpreter.
Keep hot functions type-stable to avoid repeated speculation cycles.
*/`,

  icMonomorphic: `// TOPIC: Inline Caches — Monomorphic vs Polymorphic
// RUN: node --allow-natives-syntax index.js

function readX(o) {
  return o.x;
}

// Monomorphic: all calls use one Map — V8 inlines a fixed-offset load
const a = { x: 1, y: 2 };
for (let i = 0; i < 10000; i++) readX(a);

%OptimizeFunctionOnNextCall(readX);
readX(a);
// IC state: MONOMORPHIC — fastest, single cached shape check

const b = { x: 3, z: 4 };
readX(b);
// IC state: POLYMORPHIC — V8 checks up to ~4 cached Maps per call

// const c = { x: 5, w: 6 };
// const d = { x: 7, v: 8 };
// const e = { x: 9, u: 10 };
// Uncomment all + readX(c); readX(d); readX(e);
// → MEGAMORPHIC: V8 abandons caching and falls back to a runtime lookup

/*
CONCLUSION:
Inline caches let V8 learn per-call-site which object shapes appear.
One shape (monomorphic) enables a near-direct memory read. More shapes
degrade the IC to polymorphic then megamorphic — each step slower.
*/`,

  argumentsVsRest: `// TOPIC: Bytecode — arguments Object vs Rest Parameters
// RUN: node --print-bytecode --print-bytecode-filter=sum* index.js

function sumArguments() {
  // 'arguments' is a special aliased object, not a real Array.
  // V8 emits CreateMappedArguments bytecode and must maintain aliasing
  // between 'arguments' indices and named parameter slots.
  // This extra machinery blocks several function-level optimizations.
  let s = 0;
  for (let i = 0; i < arguments.length; i++) s += arguments[i];
  return s;
}

function sumRest(...args) {
  // 'args' is a plain Array allocated from surplus arguments.
  // No special aliasing — V8 can reason about it like any other array.
  let s = 0;
  for (let i = 0; i < args.length; i++) s += args[i];
  return s;
}

sumArguments(1, 2, 3);
sumRest(1, 2, 3);

/*
CONCLUSION:
The 'arguments' object carries legacy semantics (parameter aliasing in
non-strict mode) that requires extra bytecode setup and prevents certain
optimizations. Rest parameters (...args) are plain Arrays with no aliasing —
they generate cleaner bytecode and optimize more reliably.
*/`,
};

export type V8SampleKey = keyof typeof v8Samples;
export type V8SampleDescriptor = { key: V8SampleKey; label: string; description: string };

export const v8SampleCatalog: V8SampleDescriptor[] = [
  { key: "smiVsHeap", label: "Smi vs HeapNumber", description: "Number boxing: when integers escape to the heap." },
  { key: "arrayLengthHoley", label: "Length → Holey", description: "Setting arr.length creates holes: PACKED → HOLEY." },
  { key: "arrayTypeTransitions", label: "Element Kind Cascade", description: "One-way ratchet: SMI → DOUBLE → OBJECT elements." },
  { key: "arrayDeleteVsUndefined", label: "delete vs undefined", description: "Two ways to clear a slot — only one punches a hole." },
  { key: "arrayDictionaryMode", label: "Dictionary Mode", description: "Sparse arrays switch from flat memory to a hash table." },
  { key: "hiddenClassOrder", label: "Hidden Class Order", description: "Property insertion order determines object shape (Map)." },
  { key: "hiddenClassDelete", label: "delete → Slow Props", description: "Deleting a property invalidates the hidden class chain." },
  { key: "bytecodeDestructuring", label: "Destructuring Bytecode", description: "Array destructuring vs index access: bytecode cost." },
  { key: "consString", label: "ConsString", description: "String concatenation defers character copying lazily." },
  { key: "deoptTypeChange", label: "Deoptimization", description: "Passing an unexpected type bails out of optimized code." },
  { key: "icMonomorphic", label: "Inline Caches", description: "Monomorphic → polymorphic → megamorphic IC degradation." },
  { key: "argumentsVsRest", label: "arguments vs Rest", description: "Legacy arguments object vs rest params: bytecode diff." },
];
