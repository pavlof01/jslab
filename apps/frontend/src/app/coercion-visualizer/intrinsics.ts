// intrinsics.ts
// Minimal intrinsic implementations for the coercion showcase.

import type { IntrinsicImpl, SpecValue, TypeTag } from './spec-runner';

const typeOf = (v: SpecValue): TypeTag => {
  // v.type already matches our tag model
  return v.type;
};

const sameValue: IntrinsicImpl = ([a, b]) => ({
  type: 'Boolean',
  value: a.type === b.type && JSON.stringify(a.value) === JSON.stringify(b.value),
});

const and: IntrinsicImpl = ([a, b]) => {
  if (a.type !== 'Boolean' || b.type !== 'Boolean') throw new Error('And expects booleans');
  return { type: 'Boolean', value: a.value && b.value };
};

const or: IntrinsicImpl = ([a, b]) => {
  if (a.type !== 'Boolean' || b.type !== 'Boolean') throw new Error('Or expects booleans');
  return { type: 'Boolean', value: a.value || b.value };
};

const isObject: IntrinsicImpl = ([v]) => ({ type: 'Boolean', value: v.type === 'Object' });

const Type: IntrinsicImpl = ([v]) => ({ type: 'TypeTag', value: typeOf(v) });

const StrictEquals: IntrinsicImpl = ([x, y]) => {
  if (x.type !== y.type) return { type: 'Boolean', value: false };
  // Primitive compare
  if (x.type === 'Object') {
    const yy = y as typeof x;
    return { type: 'Boolean', value: x.value.id === yy.value.id };
  }
  if (x.type === "Symbol") {
    const yy = y as typeof x;
    return { type: "Boolean", value: x.value.id === yy.value.id };
  }
  const yy = y as typeof x;
  return { type: 'Boolean', value: JSON.stringify(x.value) === JSON.stringify(yy.value) };
};

const ConcatStrings: IntrinsicImpl = ([a, b]) => {
  if (a.type !== 'String' || b.type !== 'String') throw new Error('ConcatStrings expects strings');
  return { type: 'String', value: a.value + b.value };
};

const AddNumbers: IntrinsicImpl = ([a, b]) => {
  if (a.type !== 'Number' || b.type !== 'Number') throw new Error('AddNumbers expects numbers');
  const av = a.value === 'NaN' ? NaN : a.value;
  const bv = b.value === 'NaN' ? NaN : b.value;
  const sum = av + bv;
  return { type: 'Number', value: Number.isNaN(sum) ? 'NaN' : sum };
};

const StringToNumber: IntrinsicImpl = ([s]) => {
  if (s.type !== 'String') throw new Error('StringToNumber expects a String');
  const n = Number(s.value);
  return { type: 'Number', value: Number.isNaN(n) ? 'NaN' : n };
};

const NumberToString: IntrinsicImpl = ([n]) => {
  if (n.type !== 'Number') throw new Error('NumberToString expects a Number');
  const v = n.value === 'NaN' ? NaN : n.value;
  return { type: 'String', value: String(v) };
};

const GetField: IntrinsicImpl = ([obj, key]) => {
  if (obj.type !== 'Object') throw new Error('GetField expects Object');
  if (key.type !== 'String') throw new Error('GetField key expects String');
  const v = obj.value[key.value];
  return { type: 'String', value: String(v) };
};

const ToBoolean: IntrinsicImpl = ([v]) => {
  // MVP: enough for IF conditions if you want them later
  const truthy =
    v.type === 'Undefined' || v.type === 'Null'
      ? false
      : v.type === 'Boolean'
        ? v.value
        : v.type === "BigInt"
          ? v.value !== "0"
        : v.type === 'Number'
          ? !(v.value === 0 || v.value === 'NaN')
          : v.type === 'String'
            ? v.value.length > 0
            : true;
  return { type: 'Boolean', value: truthy };
};

const ThrowTypeError: IntrinsicImpl = (args) => {
  const msg = args[0];
  const message = msg?.type === "String" ? msg.value : "TypeError";
  throw new Error(message);
};

export const intrinsicImpls: Record<string, IntrinsicImpl> = {
  Type,
  SameValue: sameValue,
  And: and,
  Or: or,
  IsObject: isObject,
  StrictEquals,
  ConcatStrings,
  AddNumbers,
  StringToNumber,
  NumberToString,
  GetField,
  ToBoolean,
  ThrowTypeError,
};
