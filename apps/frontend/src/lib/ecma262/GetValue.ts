/**
   * 
   * The abstract operation GetValue takes argument V (a Reference Record or an ECMAScript language value) and returns either a normal completion containing an ECMAScript language value or an abrupt completion. It performs the following steps when called:
      1. 1. If V is not a Reference Record, return V.
      2. 2. If IsUnresolvableReference(V) is true, throw a ReferenceError exception.
      3. 3. If IsPropertyReference(V) is true, then
      a. a. Let baseObj be ? ToObject(V.[[Base]]).
      b. b. If IsPrivateReference(V) is true, then
      i. i. Return ? PrivateGet(baseObj, V.[[ReferencedName]]).
      c. c. If V.[[ReferencedName]] is not a property key, then
      i. i. Set V.[[ReferencedName]] to ? ToPropertyKey(V.[[ReferencedName]]).
      d. d. Return ? baseObj.[[Get]](V.[[ReferencedName]], GetThisValue(V)).
      4. 4. Else,
      a. a. Let base be V.[[Base]].
      b. b. Assert: base is an Environment Record.
      c. c. Return ? base.GetBindingValue(V.[[ReferencedName]], V.[[Strict]]) (see 9.1).
   */
//TODO:
export function GetValue(v: unknown) {
  return v;
}
