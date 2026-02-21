# Skipped Steps Feature - Complete Trace Example

## Overview

Now all conditional steps are included in traces, whether they passed or were skipped. Skipped steps are marked with `executed: false` and include a `reason` field explaining why they were not executed.

## Example: `ToNumber({ toString: () => "42" })`

When converting an object with a custom `toString()` method to a number, ALL conditional checks are now traced:

```json
{
  "algorithmId": "toNumber",
  "algorithmName": "ToNumber",
  "input": { "toString": { "toString": "[Function toString]" } },
  "output": 42,
  "finalValue": 42,
  "success": true,
  "steps": [
    {
      "kind": "conditional",
      "description": "If argument is a Number, return argument.",
      "executed": false,
      "reason": "argument is object, not Number"
    },
    {
      "kind": "conditional",
      "description": "If argument is either a Symbol or a BigInt, throw a TypeError exception.",
      "executed": false,
      "reason": "argument is not Symbol or BigInt"
    },
    {
      "kind": "conditional",
      "description": "If argument is undefined, return NaN.",
      "executed": false,
      "reason": "argument is not undefined: [object Object]"
    },
    {
      "kind": "conditional",
      "description": "If argument is either null or false, return +0𝔽.",
      "executed": false,
      "reason": "argument is not null or false: [object Object]"
    },
    {
      "kind": "conditional",
      "description": "If argument is true, return 1𝔽.",
      "executed": false,
      "reason": "argument is not true: [object Object]"
    },
    {
      "kind": "conditional",
      "description": "If argument is a String, return StringToNumber(argument).",
      "executed": false,
      "reason": "argument is object, not String"
    },
    {
      "kind": "assertion",
      "description": "Assert: argument is an Object.",
      "executed": true
    },
    {
      "kind": "assignment",
      "description": "Let primValue be ? ToPrimitive(argument, NUMBER).",
      "executed": true,
      "result": "42",
      "nestedTrace": {
        "algorithmId": "toPrimitive",
        "steps": [
          {
            "kind": "conditional",
            "description": "If input is an Object, then",
            "executed": true
          },
          {
            "kind": "assignment",
            "description": "Let exoticToPrim be ? GetMethod(input, %Symbol.toPrimitive%).",
            "executed": true,
            "result": undefined
          },
          {
            "kind": "conditional",
            "description": "If exoticToPrim is not undefined, then",
            "executed": false,
            "reason": "No Symbol.toPrimitive method defined, using OrdinaryToPrimitive"
          },
          {
            "kind": "assignment",
            "description": "If preferredType is not present, let preferredType be NUMBER.",
            "executed": false,
            "reason": "preferredType is already set to \"number\""
          }
        ]
      }
    },
    {
      "kind": "assertion",
      "description": "Assert: primValue is not an Object.",
      "executed": true
    },
    {
      "kind": "return",
      "description": "Return ? ToNumber(primValue).",
      "executed": true,
      "result": 42
    }
  ]
}
```

## Key Features

### 1. **Complete Conditional History**

- All conditional branches are shown, not just the ones taken
- Skipped conditions show why they didn't execute

### 2. **Backward Compatibility**

- Existing code that only reads `executed: true` steps still works
- New code can read `executed: false` for complete trace details

### 3. **Nested Traces**

- Skipped steps work in nested algorithm calls too
- Example: ToPrimitive trace includes skipped OrdinaryToPrimitive conditionals

### 4. **Type Safety**

All steps follow the ExecutedStep interface:

```typescript
interface ExecutedStep {
  kind: string;
  description: string;
  executed: boolean; // ← Now includes FALSE for skipped steps
  result?: unknown;
  reason?: string; // ← Why step was skipped
  subSteps?: ExecutedStep[];
  nestedTrace?: TraceResult;
}
```

## Visual Representation (in UI)

```
ToNumber ({ toString: () => "42" })
├─ ❌ If argument is a Number, return argument.
│  └─ (argument is object, not Number)
├─ ❌ If argument is either a Symbol or a BigInt, throw a TypeError exception.
│  └─ (argument is not Symbol or BigInt)
├─ ❌ If argument is undefined, return NaN.
│  └─ (argument is not undefined: [object Object])
├─ ❌ If argument is either null or false, return +0𝔽.
│  └─ (argument is not null or false: [object Object])
├─ ❌ If argument is true, return 1𝔽.
│  └─ (argument is not true: [object Object])
├─ ❌ If argument is a String, return StringToNumber(argument).
│  └─ (argument is object, not String)
├─ ✅ Assert: argument is an Object.
├─ ✅ Let primValue be ? ToPrimitive(argument, NUMBER).
│  └─ [nested ToPrimitive trace...]
├─ ✅ Assert: primValue is not an Object.
└─ ✅ Return ? ToNumber(primValue).
   └─ Result: 42
```

## Benefits for Users

1. **Better Understanding**: Users see the complete decision tree of algorithm execution
2. **Debugging**: Easy to understand why certain paths were taken or skipped
3. **Educational**: Perfect for learning ECMA-262 specifications
4. **Transparency**: No hidden branches - complete algorithm flow is visible
