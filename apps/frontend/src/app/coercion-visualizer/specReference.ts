export type SpecReferenceLine = {
  marker: string; // e.g. "1.", "a.", "i."
  text: string;
  indent: number;
};

export type SpecReferenceDoc = {
  id: string;
  signature: string;
  intro: string;
  steps: SpecReferenceLine[];
};

// NOTE: This file intentionally stores spec-exact reference text for the right-side panel.
// The execution IR (catalog JSON) can remain simplified / educational, but the panel should
// show wording from the official specification as closely as possible.

export const SPEC_REFERENCE_BY_ID: Record<string, SpecReferenceDoc> = {
  ToNumber: {
    id: "ToNumber",
    signature: "ToNumber ( argument )",
    intro:
      "The abstract operation ToNumber takes argument argument (an ECMAScript language value) and returns either a normal completion containing a Number or a throw completion. It converts argument to a value of type Number. It performs the following steps when called:",
    steps: [
      { marker: "1.", text: "If argument is a Number, return argument.", indent: 0 },
      { marker: "2.", text: "If argument is either a Symbol or a BigInt, throw a TypeError exception.", indent: 0 },
      { marker: "3.", text: "If argument is undefined, return NaN.", indent: 0 },
      { marker: "4.", text: "If argument is either null or false, return +0𝔽.", indent: 0 },
      { marker: "5.", text: "If argument is true, return 1𝔽.", indent: 0 },
      { marker: "6.", text: "If argument is a String, return StringToNumber(argument).", indent: 0 },
      { marker: "7.", text: "Assert: argument is an Object.", indent: 0 },
      { marker: "8.", text: "Let primValue be ? ToPrimitive(argument, NUMBER).", indent: 0 },
      { marker: "9.", text: "Assert: primValue is not an Object.", indent: 0 },
      { marker: "10.", text: "Return ? ToNumber(primValue).", indent: 0 },
    ],
  },

  // Intrinsic in our catalog, but referenced by ToNumber in the spec.
  StringToNumber: {
    id: "StringToNumber",
    signature: "StringToNumber ( str )",
    intro:
      "The abstract operation StringToNumber takes argument str (a String) and returns a Number. It performs the following steps when called:",
    steps: [
      { marker: "1.", text: "Let literal be ParseText(str, StringNumericLiteral).", indent: 0 },
      { marker: "2.", text: "If literal is a List of errors, return NaN.", indent: 0 },
      { marker: "3.", text: "Return the StringNumericValue of literal.", indent: 0 },
    ],
  },

  ToPrimitive: {
    id: "ToPrimitive",
    signature: "ToPrimitive ( input [ , preferredType ] )",
    intro:
      "The abstract operation ToPrimitive takes argument input (an ECMAScript language value) and optional argument preferredType (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion. It converts its input argument to a non-Object type. If an object is capable of converting to more than one primitive type, it may use the optional hint preferredType to favour that type. It performs the following steps when called:",
    steps: [
      { marker: "1.", text: "If input is an Object, then", indent: 0 },
      { marker: "a.", text: "Let exoticToPrim be ? GetMethod(input, %Symbol.toPrimitive%).", indent: 1 },
      { marker: "b.", text: "If exoticToPrim is not undefined, then", indent: 1 },
      { marker: "i.", text: "If preferredType is not present, then", indent: 2 },
      { marker: "1.", text: 'Let hint be "default".', indent: 3 },
      { marker: "ii.", text: "Else if preferredType is STRING, then", indent: 2 },
      { marker: "1.", text: 'Let hint be "string".', indent: 3 },
      { marker: "iii.", text: "Else,", indent: 2 },
      { marker: "1.", text: "Assert: preferredType is NUMBER.", indent: 3 },
      { marker: "2.", text: 'Let hint be "number".', indent: 3 },
      { marker: "iv.", text: "Let result be ? Call(exoticToPrim, input, « hint »).", indent: 2 },
      { marker: "v.", text: "If result is not an Object, return result.", indent: 2 },
      { marker: "vi.", text: "Throw a TypeError exception.", indent: 2 },
      { marker: "c.", text: "If preferredType is not present, let preferredType be NUMBER.", indent: 1 },
      { marker: "d.", text: "Return ? OrdinaryToPrimitive(input, preferredType).", indent: 1 },
      { marker: "2.", text: "Return input.", indent: 0 },
    ],
  },

  OrdinaryToPrimitive: {
    id: "OrdinaryToPrimitive",
    signature: "OrdinaryToPrimitive ( O, hint )",
    intro:
      "The abstract operation OrdinaryToPrimitive takes arguments O (an Object) and hint (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion. It performs the following steps when called:",
    steps: [
      { marker: "1.", text: "If hint is STRING, then", indent: 0 },
      { marker: "a.", text: 'Let methodNames be « "toString", "valueOf" ».', indent: 1 },
      { marker: "2.", text: "Else,", indent: 0 },
      { marker: "a.", text: 'Let methodNames be « "valueOf", "toString" ».', indent: 1 },
      { marker: "3.", text: "For each element name of methodNames, do", indent: 0 },
      { marker: "a.", text: "Let method be ? Get(O, name).", indent: 1 },
      { marker: "b.", text: "If IsCallable(method) is true, then", indent: 1 },
      { marker: "i.", text: "Let result be ? Call(method, O).", indent: 2 },
      { marker: "ii.", text: "If result is not an Object, return result.", indent: 2 },
      { marker: "4.", text: "Throw a TypeError exception.", indent: 0 },
    ],
  },
};

