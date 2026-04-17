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
