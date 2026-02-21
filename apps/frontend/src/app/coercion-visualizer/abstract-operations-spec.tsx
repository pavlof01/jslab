// 7.1.4 ToNumber ( argument )
// https://262.ecma-international.org/#sec-tonumber
// The abstract operation ToNumber takes argument argument (an ECMAScript language value) and returns either a normal completion containing a Number or a throw completion. It converts argument to a value of type Number. It performs the following steps when called:

// 1. 1. If argument is a Number, return argument.
// 2. 2. If argument is either a Symbol or a BigInt, throw a TypeError exception.
// 3. 3. If argument is undefined, return NaN.
// 4. 4. If argument is either null or false, return +0𝔽.
// 5. 5. If argument is true, return 1𝔽.
// 6. 6. If argument is a String, return StringToNumber(argument).
// 7. 7. Assert: argument is an Object.
// 8. 8. Let primValue be ? ToPrimitive(argument, NUMBER).
// 9. 9. Assert: primValue is not an Object.
// 10. 10. Return ? ToNumber(primValue).

// --------------------------------------------------------------------------------------------------------

// 7.1.4.1.1 StringToNumber ( str )
// https://262.ecma-international.org/#sec-stringtonumber
// The abstract operation StringToNumber takes argument str (a String) and returns a Number. It performs the following steps when called:
// in short same as Number(str)

// 1. 1. Let literal be ParseText(str, StringNumericLiteral).
// 2. 2. If literal is a List of errors, return NaN.
// 3. 3. Return the StringNumericValue of literal.

// --------------------------------------------------------------------------------------------------------

// ToPrimitive ( input [ , preferredType ] )
// https://262.ecma-international.org/#sec-toprimitive
// The abstract operation ToPrimitive takes argument input (an ECMAScript language value) and optional argument preferredType (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion. It converts its input argument to a non-Object type. If an object is capable of converting to more than one primitive type, it may use the optional hint preferredType to favour that type. It performs the following steps when called:

// 1. 1. If input is an Object, then
// a. a. Let exoticToPrim be ? GetMethod(input, %Symbol.toPrimitive%).
// b. b. If exoticToPrim is not undefined, then
// i. i. If preferredType is not present, then
// 1. 1. Let hint be "default".
// ii. ii. Else if preferredType is STRING, then
// 1. 1. Let hint be "string".
// iii. iii. Else,
// 1. 1. Assert: preferredType is NUMBER.
// 2. 2. Let hint be "number".
// iv. iv. Let result be ? Call(exoticToPrim, input, « hint »).
// v. v. If result is not an Object, return result.
// vi. vi. Throw a TypeError exception.
// c. c. If preferredType is not present, let preferredType be NUMBER.
// d. d. Return ? OrdinaryToPrimitive(input, preferredType).
// 2. 2. Return input.

// --------------------------------------------------------------------------------------------------------

// OrdinaryToPrimitive ( O, hint )
// https://262.ecma-international.org/#sec-ordinarytoprimitive
// The abstract operation OrdinaryToPrimitive takes arguments O (an Object) and hint (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion. It performs the following steps when called:

// 1. 1. If hint is STRING, then
// a. a. Let methodNames be « "toString", "valueOf" ».
// 2. 2. Else,
// a. a. Let methodNames be « "valueOf", "toString" ».
// 3. 3. For each element name of methodNames, do
// a. a. Let method be ? Get(O, name).
// b. b. If IsCallable(method) is true, then
// i. i. Let result be ? Call(method, O).
// ii. ii. If result is not an Object, return result.
// 4. 4. Throw a TypeError exception.

// --------------------------------------------------------------------------------------------------------

// IsCallable ( argument )
// https://262.ecma-international.org/#sec-iscallable
// The abstract operation IsCallable takes argument argument (an ECMAScript language value) and returns a Boolean. It determines if argument is a callable function with a [[Call]] internal method. It performs the following steps when called:

// 1. 1. If argument is not an Object, return false.
// 2. 2. If argument has a [[Call]] internal method, return true.
// 3. 3. Return false.
