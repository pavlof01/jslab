/**
 * Generates ecmarkup HTML for a subset of ECMAScript algorithms.
 * Each top-level function declares which algorithms it can reach —
 * the HTML is built once per function name and cached in memory.
 */
import { build } from "ecmarkup";

// ── Full spec source for every traceable algorithm ───────────────────────────

const ALGO_CLAUSES: Record<string, string> = {
  ToNumber: `
<emu-clause id="ToNumber" aoid="ToNumber" type="abstract operation">
  <h1>
    ToNumber (
      _argument_: an ECMAScript language value,
    )
  </h1>
  <dl class="header">
    <dt>description</dt><dd>Converts _argument_ to a value of type Number.</dd>
  </dl>
  <emu-alg>
    1. [id="ToNumber-step-1"] If _argument_ is a Number, return _argument_.
    1. [id="ToNumber-step-2"] If _argument_ is either a Symbol or a BigInt, throw a *TypeError* exception.
    1. [id="ToNumber-step-3"] If _argument_ is *undefined*, return *NaN*.
    1. [id="ToNumber-step-4"] If _argument_ is either *null* or *false*, return *+0*<sub>𝔽</sub>.
    1. [id="ToNumber-step-5"] If _argument_ is *true*, return *1*<sub>𝔽</sub>.
    1. [id="ToNumber-step-6"] If _argument_ is a String, return StringToNumber(_argument_).
    1. [id="ToNumber-step-7"] Assert: _argument_ is an Object.
    1. [id="ToNumber-step-8"] Let _primValue_ be ? ToPrimitive(_argument_, ~number~).
    1. [id="ToNumber-step-9"] Assert: _primValue_ is not an Object.
    1. [id="ToNumber-step-10"] Return ? ToNumber(_primValue_).
  </emu-alg>
</emu-clause>`,

  ToPrimitive: `
<emu-clause id="ToPrimitive" aoid="ToPrimitive" type="abstract operation">
  <h1>
    ToPrimitive (
      _input_: an ECMAScript language value,
      optional _preferredType_: ~string~ or ~number~,
    )
  </h1>
  <dl class="header">
    <dt>description</dt><dd>Converts _input_ to a non-Object type, optionally preferring _preferredType_.</dd>
  </dl>
  <emu-alg>
    1. [id="ToPrimitive-step-1"] Assert: _input_ is an ECMAScript language value.
    1. [id="ToPrimitive-step-2"] If _input_ is an Object, then
      1. [id="ToPrimitive-step-2a"] Let _exoticToPrim_ be ? GetMethod(_input_, %Symbol.toPrimitive%).
      1. [id="ToPrimitive-step-2b"] If _exoticToPrim_ is not *undefined*, then
        1. [id="ToPrimitive-step-2b-i"] If _preferredType_ is not present, let _hint_ be *"default"*.
        1. [id="ToPrimitive-step-2b-ii"] Else if _preferredType_ is ~string~, let _hint_ be *"string"*.
        1. [id="ToPrimitive-step-2b-iii"] Else,
          1. Assert: _preferredType_ is ~number~.
          1. Let _hint_ be *"number"*.
        1. [id="ToPrimitive-step-2b-iv"] Let _result_ be ? Call(_exoticToPrim_, _input_, « _hint_ »).
        1. [id="ToPrimitive-step-2b-v"] If _result_ is not an Object, return _result_.
        1. [id="ToPrimitive-step-2b-vi"] Throw a *TypeError* exception.
      1. [id="ToPrimitive-step-2c"] If _preferredType_ is not present, let _preferredType_ be ~number~.
      1. [id="ToPrimitive-step-2d"] Return ? OrdinaryToPrimitive(_input_, _preferredType_).
    1. [id="ToPrimitive-step-3"] Return _input_.
  </emu-alg>
</emu-clause>`,

  OrdinaryToPrimitive: `
<emu-clause id="OrdinaryToPrimitive" aoid="OrdinaryToPrimitive" type="abstract operation">
  <h1>
    OrdinaryToPrimitive (
      _O_: an Object,
      _hint_: ~string~ or ~number~,
    )
  </h1>
  <dl class="header">
    <dt>description</dt><dd>Converts _O_ to a primitive by calling its *valueOf* or *toString* method based on _hint_.</dd>
  </dl>
  <emu-alg>
    1. [id="OrdinaryToPrimitive-step-1"] Assert: _O_ is an ordinary Object.
    1. [id="OrdinaryToPrimitive-step-2"] Assert: _hint_ is either ~string~ or ~number~.
    1. [id="OrdinaryToPrimitive-step-3"] If _hint_ is ~string~, then
      1. Let _methodNames_ be « *"toString"*, *"valueOf"* ».
    1. [id="OrdinaryToPrimitive-step-4"] Else,
      1. Let _methodNames_ be « *"valueOf"*, *"toString"* ».
    1. [id="OrdinaryToPrimitive-step-5"] For each element _name_ of _methodNames_, do
      1. [id="OrdinaryToPrimitive-step-5a"] Let _method_ be ? Get(_O_, _name_).
      1. [id="OrdinaryToPrimitive-step-5b"] If IsCallable(_method_) is *true*, then
        1. [id="OrdinaryToPrimitive-step-5b-i"] Let _result_ be ? Call(_method_, _O_).
        1. [id="OrdinaryToPrimitive-step-5b-ii"] If _result_ is not an Object, return _result_.
    1. [id="OrdinaryToPrimitive-step-6"] Throw a *TypeError* exception.
  </emu-alg>
</emu-clause>`,

  GetMethod: `
<emu-clause id="GetMethod" aoid="GetMethod" type="abstract operation">
  <h1>
    GetMethod (
      _V_: an ECMAScript language value,
      _P_: a property key,
    )
  </h1>
  <dl class="header">
    <dt>description</dt><dd>Returns the value of property _P_ of _V_ if it is callable, otherwise *undefined*.</dd>
  </dl>
  <emu-alg>
    1. [id="GetMethod-step-1"] Assert: IsPropertyKey(_P_) is *true*.
    1. [id="GetMethod-step-2"] Let _func_ be ? GetV(_V_, _P_).
    1. [id="GetMethod-step-3"] If _func_ is either *undefined* or *null*, return *undefined*.
    1. [id="GetMethod-step-4"] If IsCallable(_func_) is *false*, throw a *TypeError* exception.
    1. [id="GetMethod-step-5"] Return _func_.
  </emu-alg>
</emu-clause>`,

  GetV: `
<emu-clause id="GetV" aoid="GetV" type="abstract operation">
  <h1>
    GetV (
      _V_: an ECMAScript language value,
      _P_: a property key,
    )
  </h1>
  <dl class="header">
    <dt>description</dt><dd>Retrieves the value of property _P_ of _V_, using a wrapper object if _V_ is not an Object.</dd>
  </dl>
  <emu-alg>
    1. [id="GetV-step-1"] Assert: IsPropertyKey(_P_) is *true*.
    1. [id="GetV-step-2"] Let _O_ be ? ToObject(_V_).
    1. [id="GetV-step-3"] Return ? _O_.[[Get]](_P_, _V_).
  </emu-alg>
</emu-clause>`,

  Get: `
<emu-clause id="Get" aoid="Get" type="abstract operation">
  <h1>
    Get (
      _O_: an Object,
      _P_: a property key,
    )
  </h1>
  <dl class="header">
    <dt>description</dt><dd>Retrieves the value of a specific property of an Object.</dd>
  </dl>
  <emu-alg>
    1. [id="Get-step-1"] Assert: _O_ is an Object.
    1. [id="Get-step-2"] Assert: IsPropertyKey(_P_) is *true*.
    1. [id="Get-step-3"] Return ? _O_.[[Get]](_P_, _O_).
  </emu-alg>
</emu-clause>`,

  ToObject: `
<emu-clause id="ToObject" aoid="ToObject" type="abstract operation">
  <h1>
    ToObject (
      _argument_: an ECMAScript language value,
    )
  </h1>
  <dl class="header">
    <dt>description</dt><dd>Converts _argument_ to a value of type Object.</dd>
  </dl>
  <emu-alg>
    1. [id="ToObject-step-1"] If _argument_ is *undefined*, throw a *TypeError* exception.
    1. [id="ToObject-step-2"] If _argument_ is *null*, throw a *TypeError* exception.
    1. [id="ToObject-step-3"] If _argument_ is a Boolean, return a new Boolean object whose [[BooleanData]] is _argument_.
    1. [id="ToObject-step-4"] If _argument_ is a Number, return a new Number object whose [[NumberData]] is _argument_.
    1. [id="ToObject-step-5"] If _argument_ is a String, return a new String object whose [[StringData]] is _argument_.
    1. [id="ToObject-step-6"] If _argument_ is a Symbol, return a new Symbol object whose [[SymbolData]] is _argument_.
    1. [id="ToObject-step-7"] If _argument_ is a BigInt, return a new BigInt object whose [[BigIntData]] is _argument_.
    1. [id="ToObject-step-8"] Assert: _argument_ is an Object. Return _argument_.
  </emu-alg>
</emu-clause>`,

  Call: `
<emu-clause id="Call" aoid="Call" type="abstract operation">
  <h1>
    Call (
      _F_: an ECMAScript language value,
      _V_: an ECMAScript language value,
      optional _argumentsList_: a List of ECMAScript language values,
    )
  </h1>
  <dl class="header">
    <dt>description</dt><dd>Calls the [[Call]] internal method of _F_ with _V_ as the *this* value.</dd>
  </dl>
  <emu-alg>
    1. [id="Call-step-1"] If _argumentsList_ is not present, set _argumentsList_ to a new empty List.
    1. [id="Call-step-2"] If IsCallable(_F_) is *false*, throw a *TypeError* exception.
    1. [id="Call-step-3"] Return ? _F_.[[Call]](_V_, _argumentsList_).
  </emu-alg>
</emu-clause>`,

  ToString: `
<emu-clause id="ToString" aoid="ToString" type="abstract operation">
  <h1>
    ToString (
      _argument_: an ECMAScript language value,
    )
  </h1>
  <dl class="header">
    <dt>description</dt><dd>Converts _argument_ to a value of type String.</dd>
  </dl>
  <emu-alg>
    1. [id="ToString-step-1"] If _argument_ is a String, return _argument_.
    1. [id="ToString-step-2"] If _argument_ is a Symbol, throw a *TypeError* exception.
    1. [id="ToString-step-3"] If _argument_ is *undefined*, return *"undefined"*.
    1. [id="ToString-step-4"] If _argument_ is *null*, return *"null"*.
    1. [id="ToString-step-5"] If _argument_ is *true*, return *"true"*.
    1. [id="ToString-step-6"] If _argument_ is *false*, return *"false"*.
    1. [id="ToString-step-7"] If _argument_ is a Number, return Number::toString(_argument_, 10).
    1. [id="ToString-step-8"] If _argument_ is a BigInt, return BigInt::toString(_argument_, 10).
    1. [id="ToString-step-9"] Assert: _argument_ is an Object.
    1. [id="ToString-step-10"] Let _primValue_ be ? ToPrimitive(_argument_, ~string~).
    1. [id="ToString-step-11"] Assert: _primValue_ is not an Object.
    1. [id="ToString-step-12"] Return ? ToString(_primValue_).
  </emu-alg>
</emu-clause>`,

  ToBoolean: `
<emu-clause id="ToBoolean" aoid="ToBoolean" type="abstract operation">
  <h1>
    ToBoolean (
      _argument_: an ECMAScript language value,
    )
  </h1>
  <dl class="header">
    <dt>description</dt><dd>Converts _argument_ to a value of type Boolean.</dd>
  </dl>
  <emu-alg>
    1. [id="ToBoolean-step-1"] If _argument_ is a Boolean, return _argument_.
    1. [id="ToBoolean-step-2"] If _argument_ is one of *undefined*, *null*, *+0*<sub>𝔽</sub>, *-0*<sub>𝔽</sub>, *NaN*, *0*<sub>ℤ</sub>, or *""*, return *false*.
    1. [id="ToBoolean-step-3"] NOTE: This step is replaced in section B.3.6.1.
    1. [id="ToBoolean-step-4"] Return *true*.
  </emu-alg>
</emu-clause>`,

  ToNumeric: `
<emu-clause id="ToNumeric" aoid="ToNumeric" type="abstract operation">
  <h1>
    ToNumeric (
      _value_: an ECMAScript language value,
    )
  </h1>
  <dl class="header">
    <dt>description</dt><dd>Returns a Number or BigInt. It converts _value_ to a numeric value of either type.</dd>
  </dl>
  <emu-alg>
    1. [id="ToNumeric-step-1"] Let _primValue_ be ? ToPrimitive(_value_, ~number~).
    1. [id="ToNumeric-step-2"] If _primValue_ is a BigInt, return _primValue_.
    1. [id="ToNumeric-step-3"] Return ? ToNumber(_primValue_).
  </emu-alg>
</emu-clause>`,
};

// ── Static map: which algorithms each top-level function can reach ───────────
// Ordered for display (spec reading order).

const FUNCTION_ALGOS: Record<string, string[]> = {
  ToNumber:    ["ToNumber", "ToPrimitive", "OrdinaryToPrimitive", "GetMethod", "GetV", "ToObject", "Get", "Call"],
  ToString:    ["ToString", "ToPrimitive", "OrdinaryToPrimitive", "GetMethod", "GetV", "ToObject", "Get", "Call"],
  ToBoolean:   ["ToBoolean"],
  ToNumeric:   ["ToNumeric", "ToPrimitive", "OrdinaryToPrimitive", "GetMethod", "GetV", "ToObject", "Get", "Call", "ToNumber"],
  ToPrimitive: ["ToPrimitive", "OrdinaryToPrimitive", "GetMethod", "GetV", "ToObject", "Get", "Call"],
  ToObject:    ["ToObject"],
  ToPropertyKey: ["ToPropertyKey", "ToPrimitive", "OrdinaryToPrimitive", "GetMethod", "GetV", "ToObject", "Get", "Call", "ToString"],
  ToLength:    ["ToLength", "ToNumber", "ToPrimitive", "OrdinaryToPrimitive", "GetMethod", "GetV", "ToObject", "Get", "Call"],
  ToIndex:     ["ToIndex", "ToNumber", "ToPrimitive", "OrdinaryToPrimitive", "GetMethod", "GetV", "ToObject", "Get", "Call"],
};

// ── Per-function HTML cache ───────────────────────────────────────────────────

const _cache = new Map<string, string>();

// ── Build and cache ecmarkup HTML for a function name ────────────────────────

async function buildHtmlForAlgos(algoIds: string[]): Promise<string> {
  const clauses = algoIds
    .map((id) => ALGO_CLAUSES[id])
    .filter(Boolean)
    .join("\n");

  if (!clauses) return "";

  const source = `<!DOCTYPE html><html><head><title>spec</title></head><body>${clauses}</body></html>`;

  const spec = await build(
    "spec.html",
    async (path: string) => (path === "spec.html" ? source : ""),
    { assets: "none", toc: false, copyright: false },
  );

  const clauseEls = Array.from(spec.doc.querySelectorAll("emu-clause"));
  return clauseEls.map((el: Element) => el.outerHTML).join("\n");
}

export async function buildSpecHtmlForFunction(functionName: string): Promise<string | null> {
  const algos = FUNCTION_ALGOS[functionName];
  if (!algos) return null;

  if (_cache.has(functionName)) return _cache.get(functionName)!;

  const html = await buildHtmlForAlgos(algos);
  _cache.set(functionName, html);
  return html;
}

export const SUPPORTED_SPEC_FUNCTIONS = Object.keys(FUNCTION_ALGOS);
