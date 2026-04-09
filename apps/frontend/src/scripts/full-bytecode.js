"use strict";

/********************************************************************
 *  Maths, equals, logic, bit operations, and type coercion
 ********************************************************************/

function arithmeticOps(a, b) {
  const x = a + b;
  const y = a - b;
  const z = a * b;
  const d = a / (b || 1);
  const m = a % (b || 1);
  const neg = -a;
  const plus = +b;

  const bitAnd = a & b;
  const bitOr = a | b;
  const bitXor = a ^ b;
  const shl = a << 1;
  const shr = a >> 1;
  const ushr = a >>> 1;

  return x + y + z + d + m + neg + plus + bitAnd + bitOr + bitXor + shl + shr + ushr;
}

function comparisonOps(a, b) {
  let r = 0;
  if (a == b) r++;
  if (a === b) r++;
  if (a != b) r++;
  if (a !== b) r++;
  if (a < b) r++;
  if (a <= b) r++;
  if (a > b) r++;
  if (a >= b) r++;
  if (a in b) r++;
  if (b instanceof Object) r++;
  return r;
}

function logicalOps(a, b) {
  let r1 = a && b;
  let r2 = a || b;
  let r3 = !a;
  let r4 = a ?? b;
  return r1 + r2 + r3 + r4;
}

/********************************************************************
 *  Fow control: if, switch, for
 ********************************************************************/

function controlFlowIf(x) {
  let r = 0;
  if (x > 10) {
    r = 1;
  } else if (x > 5) {
    r = 2;
  } else {
    r = 3;
  }
  return r;
}

function controlFlowSwitch(x) {
  let r;
  switch (x) {
    case 0:
      r = "zero";
      break;
    case 1:
    case 2:
      r = "one-two";
      break;
    default:
      r = "other";
  }
  return r;
}

function loops(n) {
  let sum = 0;

  // for
  for (let i = 0; i < n; i++) {
    sum += i;
  }

  // while
  let j = 0;
  while (j < n) {
    sum += j;
    j++;
  }

  // do..while
  let k = 0;
  do {
    sum += k;
    k++;
  } while (k < n);

  return sum;
}

/********************************************************************
 *  Arrays, Objects, Desc, rest/spread
 ********************************************************************/

function arraysAndObjects() {
  const arr = [1, 2, 3, { a: 10 }];
  const obj = {
    x: 1,
    y: 2,
    nested: { foo: "bar" },
  };

  const [first, , third] = arr;
  const {
    x,
    nested: { foo },
  } = obj;

  const arr2 = [...arr, 4, 5];
  const obj2 = { ...obj, z: 3 };

  return first + third + x + (foo === "bar" ? 1 : 0) + arr2.length + (obj2.z || 0);
}

/********************************************************************
 *  functions: functions declaration, expressions, default/rest, arguments
 ********************************************************************/

function withDefaultsAndRest(a = 1, b = 2, ...rest) {
  let s = a + b;
  for (let i = 0; i < rest.length; i++) {
    s += rest[i];
  }
  return s;
}

const arrowSimple = (x) => x * 2;

const arrowWithBlock = (x) => {
  const y = x + 1;
  return y * 2;
};

function useArguments() {
  let sum = 0;
  for (let i = 0; i < arguments.length; i++) {
    sum += arguments[i];
  }
  return sum;
}

/********************************************************************
 *  Closure
 ********************************************************************/

function makeCounter(start = 0) {
  let value = start;

  function increment() {
    value++;
    return value;
  }

  function add(delta) {
    value += delta;
    return value;
  }

  return { increment, add };
}

/********************************************************************
 *  try/catch/finally, throw
 ********************************************************************/

function errorFlow(x) {
  try {
    if (x < 0) {
      throw new Error("negative");
    }
    if (x === 0) {
      throw "zero-string";
    }
    return "ok";
  } catch (e) {
    if (e instanceof Error) {
      return "error:" + e.message;
    }
    return "caught:" + String(e);
  } finally {
    // Something pointless, just so there is a finally block
    x++;
  }
}

/********************************************************************
 *  async/await, Promise, generators
 ********************************************************************/

async function asyncSimple() {
  const v = await 1;
  return v + 1;
}

async function asyncWithError() {
  try {
    const v = await Promise.resolve(10);
    if (v > 5) {
      throw new Error("too-big");
    }
    return v;
  } catch (e) {
    return "caught:" + (e && e.message);
  }
}

function* generatorSimple(n) {
  let i = 0;
  while (i < n) {
    yield i++;
  }
}

async function asyncUseGenerator() {
  const gen = generatorSimple(3);
  let sum = 0;
  for (const v of gen) {
    sum += v;
  }
  return sum;
}

/********************************************************************
 *  for..of, for..in, Iterator
 ********************************************************************/

function iterationStuff(obj) {
  let sum = 0;

  const arr = [1, 2, 3];
  for (const v of arr) {
    sum += v;
  }

  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      sum += obj[k];
    }
  }

  const set = new Set([1, 2, 3]);
  for (const v of set) {
    sum += v;
  }

  const map = new Map([
    ["a", 1],
    ["b", 2],
  ]);
  for (const [k, v] of map) {
    if (k === "a" || k === "b") sum += v;
  }

  return sum;
}

/********************************************************************
 *  Classes, inheritance, super, static fields, getters/setters
 ********************************************************************/

class Base {
  constructor(value) {
    this.value = value;
  }

  inc() {
    this.value++;
    return this.value;
  }

  get doubled() {
    return this.value * 2;
  }

  set doubled(v) {
    this.value = v / 2;
  }

  static staticMethod(x) {
    return x * 10;
  }
}

class Derived extends Base {
  constructor(value, extra) {
    super(value);
    this.extra = extra;
  }

  inc() {
    const v = super.inc();
    this.extra++;
    return v + this.extra;
  }

  static staticMethod(x) {
    return super.staticMethod(x) + 1;
  }
}

function useClasses() {
  const d = new Derived(1, 2);
  const a = d.inc();
  const b = d.doubled;
  d.doubled = 20;
  const c = d.value;
  const s = Derived.staticMethod(3);
  return a + b + c + s;
}

/********************************************************************
 *  Optional chaining, nullish coalescing
 ********************************************************************/

function optionalAndNullish(obj) {
  const maybe = obj?.nested?.value ?? 42;
  const maybeFnResult = obj?.fn?.(10) ?? 0;
  return maybe + maybeFnResult;
}

/********************************************************************
 *  other: Object/Array methods, JSON, Date etc..
 ********************************************************************/

function miscStuff() {
  const o = { a: 1, b: 2 };
  const keys = Object.keys(o);
  const values = Object.values(o);
  const entries = Object.entries(o);

  const now = Date.now();
  const iso = new Date(now).toISOString();

  const json = JSON.stringify({ iso, keys, values, entries });
  const parsed = JSON.parse(json);

  return parsed.keys.length + parsed.values.length + parsed.entries.length + iso.length;
}

/********************************************************************
 *  MAIN FUNCTION
 ********************************************************************/

function runAll() {
  arithmeticOps(5, 3);
  comparisonOps(1, { foo: 1 });
  logicalOps(0, 1);
  controlFlowIf(7);
  controlFlowSwitch(2);
  loops(5);
  arraysAndObjects();
  withDefaultsAndRest(1, 2, 3, 4, 5);
  arrowSimple(10);
  arrowWithBlock(10);
  useArguments(1, 2, 3, 4);
  const counter = makeCounter(10);
  counter.increment();
  counter.add(5);
  errorFlow(-1);

  asyncSimple();
  asyncWithError();
  asyncUseGenerator();

  const obj = { foo: 1, bar: 2 };
  iterationStuff(obj);

  useClasses();

  optionalAndNullish({
    nested: { value: 5 },
    fn: (x) => x * 2,
  });

  miscStuff();

  for (const x of generatorSimple(4)) {
    if (x > 10) break;
  }

  return true;
}

runAll();

export {
  arithmeticOps,
  comparisonOps,
  logicalOps,
  controlFlowIf,
  controlFlowSwitch,
  loops,
  arraysAndObjects,
  withDefaultsAndRest,
  arrowSimple,
  arrowWithBlock,
  useArguments,
  makeCounter,
  errorFlow,
  asyncSimple,
  asyncWithError,
  generatorSimple,
  asyncUseGenerator,
  iterationStuff,
  Base,
  Derived,
  useClasses,
  optionalAndNullish,
  miscStuff,
  runAll,
};
