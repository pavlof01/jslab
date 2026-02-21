/**
 * Примеры JSON output'а от Algorithm Executors
 * Используется для UI testing и понимания структуры данных
 */

import type { TraceResult } from '../abstract-operations-tracer';

/**
 * Пример 1: Преобразование числа (простой случай)
 */
export const EXAMPLE_TO_NUMBER_NUMBER: TraceResult = {
  algorithmId: 'toNumber',
  algorithmName: 'ToNumber',
  algorithmDescription:
    'The abstract operation ToNumber takes argument argument (an ECMAScript language value) and returns either a normal completion containing a Number or a throw completion. It converts argument to a value of type Number.',
  algorithmSection: '7.1.4',
  algorithmUrl: 'https://262.ecma-international.org/#sec-tonumber',
  input: 42,
  output: 42,
  success: true,
  steps: [
    {
      number: 1,
      kind: 'return',
      description: 'If argument is a Number, return argument.',
      executed: true,
      result: 42,
    },
  ],
  finalValue: 42,
};

/**
 * Пример 2: Преобразование undefined
 */
export const EXAMPLE_TO_NUMBER_UNDEFINED: TraceResult = {
  algorithmId: 'toNumber',
  algorithmName: 'ToNumber',
  algorithmDescription:
    'The abstract operation ToNumber takes argument argument (an ECMAScript language value) and returns either a normal completion containing a Number or a throw completion. It converts argument to a value of type Number.',
  algorithmSection: '7.1.4',
  algorithmUrl: 'https://262.ecma-international.org/#sec-tonumber',
  input: undefined,
  output: NaN,
  success: true,
  steps: [
    {
      number: 3,
      kind: 'return',
      description: 'If argument is undefined, return NaN.',
      executed: true,
      result: NaN,
    },
  ],
  finalValue: NaN,
};

/**
 * Пример 3: Преобразование строки (со вложенной трассировкой)
 */
export const EXAMPLE_TO_NUMBER_STRING: TraceResult = {
  algorithmId: 'toNumber',
  algorithmName: 'ToNumber',
  algorithmDescription:
    'The abstract operation ToNumber takes argument argument (an ECMAScript language value) and returns either a normal completion containing a Number or a throw completion. It converts argument to a value of type Number.',
  algorithmSection: '7.1.4',
  algorithmUrl: 'https://262.ecma-international.org/#sec-tonumber',
  input: '42',
  output: 42,
  success: true,
  steps: [
    {
      number: 6,
      kind: 'assignment',
      description: 'If argument is a String, call StringToNumber(argument).',
      executed: true,
      result: '42',
    },
    {
      number: 6,
      kind: 'return',
      description: 'Return StringToNumber(argument).',
      executed: true,
      result: 42,
      nestedTrace: {
        algorithmId: 'stringToNumber',
        algorithmName: 'StringToNumber',
        algorithmDescription:
          'The abstract operation StringToNumber takes argument str (a String) and returns a Number.',
        algorithmSection: '7.1.4.1.1',
        algorithmUrl: 'https://262.ecma-international.org/#sec-stringtonumber',
        input: '42',
        output: 42,
        success: true,
        steps: [
          {
            kind: 'assignment',
            description: 'Let literal be ParseText(str, StringNumericLiteral).',
            executed: true,
            result: '42',
          },
          {
            kind: 'return',
            description: 'Return the StringNumericValue of literal.',
            executed: true,
            result: 42,
          },
        ],
        finalValue: 42,
      },
    },
  ],
  finalValue: 42,
};

/**
 * Пример 4: Преобразование объекта (со всеми вложениями)
 */
export const EXAMPLE_TO_NUMBER_OBJECT: TraceResult = {
  algorithmId: 'toNumber',
  algorithmName: 'ToNumber',
  algorithmDescription:
    'The abstract operation ToNumber takes argument argument (an ECMAScript language value) and returns either a normal completion containing a Number or a throw completion. It converts argument to a value of type Number.',
  algorithmSection: '7.1.4',
  algorithmUrl: 'https://262.ecma-international.org/#sec-tonumber',
  input: { valueOf: () => 42 },
  output: 42,
  success: true,
  steps: [
    {
      number: 7,
      kind: 'assertion',
      description: 'Assert: argument is an Object.',
      executed: true,
    },
    {
      number: 8,
      kind: 'assignment',
      description: 'Let primValue be ? ToPrimitive(argument, NUMBER).',
      executed: true,
      result: 42,
      nestedTrace: {
        algorithmId: 'toPrimitive',
        algorithmName: 'ToPrimitive',
        algorithmDescription:
          'The abstract operation ToPrimitive takes argument input (an ECMAScript language value) and optional argument preferredType (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion.',
        algorithmUrl: 'https://262.ecma-international.org/#sec-toprimitive',
        input: { valueOf: () => 42 },
        output: 42,
        success: true,
        steps: [
          {
            kind: 'assignment',
            description: 'If preferredType is not present, let preferredType be NUMBER.',
            executed: true,
            result: 'NUMBER',
          },
          {
            kind: 'return',
            description: 'Return ? OrdinaryToPrimitive(input, preferredType).',
            executed: true,
            result: 42,
            nestedTrace: {
              algorithmId: 'ordinaryToPrimitive',
              algorithmName: 'OrdinaryToPrimitive',
              algorithmDescription:
                'The abstract operation OrdinaryToPrimitive takes arguments O (an Object) and hint (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion.',
              algorithmUrl: 'https://262.ecma-international.org/#sec-ordinarytoprimitive',
              input: { valueOf: () => 42 },
              output: 42,
              success: true,
              steps: [
                {
                  number: 2,
                  kind: 'conditional',
                  description: 'Else,',
                  executed: true,
                  subSteps: [
                    {
                      letter: 'a',
                      kind: 'assignment',
                      description: 'Let methodNames be « "valueOf", "toString" ».',
                      executed: true,
                      result: ['valueOf', 'toString'],
                    },
                  ],
                },
                {
                  number: 3,
                  kind: 'loop',
                  description: 'For each element name of methodNames, do',
                  executed: true,
                  subSteps: [
                    {
                      letter: 'a',
                      kind: 'assignment',
                      description: 'Let method be ? Get(O, "valueOf").',
                      executed: true,
                      result: 'function', // In reality, the actual function
                    },
                    {
                      letter: 'b',
                      kind: 'assignment',
                      description: 'Let result be ? Call(method, O).',
                      executed: true,
                      result: 42,
                    },
                    {
                      roman: 'ii',
                      kind: 'return',
                      description: 'If result is not an Object, return result.',
                      executed: true,
                      result: 42,
                    },
                  ],
                },
              ],
              finalValue: 42,
            },
          },
        ],
        finalValue: 42,
      },
    },
    {
      number: 9,
      kind: 'assertion',
      description: 'Assert: primValue is not an Object.',
      executed: true,
    },
    {
      number: 10,
      kind: 'return',
      description: 'Return ? ToNumber(primValue).',
      executed: true,
      result: 42,
      nestedTrace: {
        algorithmId: 'toNumber',
        algorithmName: 'ToNumber',
        algorithmDescription:
          'The abstract operation ToNumber takes argument argument (an ECMAScript language value) and returns either a normal completion containing a Number or a throw completion. It converts argument to a value of type Number.',
        algorithmSection: '7.1.4',
        algorithmUrl: 'https://262.ecma-international.org/#sec-tonumber',
        input: 42,
        output: 42,
        success: true,
        steps: [
          {
            number: 1,
            kind: 'return',
            description: 'If argument is a Number, return argument.',
            executed: true,
            result: 42,
          },
        ],
        finalValue: 42,
      },
    },
  ],
  finalValue: 42,
};

/**
 * Пример 5: Symbol - выброс ошибки
 */
export const EXAMPLE_TO_NUMBER_SYMBOL_ERROR: TraceResult = {
  algorithmId: 'toNumber',
  algorithmName: 'ToNumber',
  algorithmDescription:
    'The abstract operation ToNumber takes argument argument (an ECMAScript language value) and returns either a normal completion containing a Number or a throw completion. It converts argument to a value of type Number.',
  algorithmSection: '7.1.4',
  algorithmUrl: 'https://262.ecma-international.org/#sec-tonumber',
  input: Symbol('test'),
  output: undefined,
  success: false,
  steps: [
    {
      number: 2,
      kind: 'throw',
      description: 'If argument is either a Symbol or a BigInt, throw a TypeError exception.',
      executed: true,
      reason: 'Cannot convert Symbol or BigInt to number',
    },
  ],
  error: 'TypeError: Cannot convert Symbol or BigInt to number',
};

/**
 * Пример 6: StringToNumber с пустой строкой
 */
export const EXAMPLE_STRING_TO_NUMBER_EMPTY: TraceResult = {
  algorithmId: 'stringToNumber',
  algorithmName: 'StringToNumber',
  algorithmDescription:
    'The abstract operation StringToNumber takes argument str (a String) and returns a Number.',
  algorithmSection: '7.1.4.1.1',
  algorithmUrl: 'https://262.ecma-international.org/#sec-stringtonumber',
  input: '',
  output: 0,
  success: true,
  steps: [
    {
      kind: 'assignment',
      description: 'Let literal be ParseText(str, StringNumericLiteral).',
      executed: true,
      result: '',
    },
    {
      kind: 'return',
      description: 'Return the StringNumericValue of literal.',
      executed: true,
      result: 0,
    },
  ],
  finalValue: 0,
};

/**
 * Пример 7: OrdinaryToPrimitive с METHOD VALUE
 */
export const EXAMPLE_ORDINARY_TO_PRIMITIVE: TraceResult = {
  algorithmId: 'ordinaryToPrimitive',
  algorithmName: 'OrdinaryToPrimitive',
  algorithmDescription:
    'The abstract operation OrdinaryToPrimitive takes arguments O (an Object) and hint (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion.',
  algorithmUrl: 'https://262.ecma-international.org/#sec-ordinarytoprimitive',
  input: { toString: () => 'test', valueOf: () => 42 },
  output: 42,
  success: true,
  steps: [
    {
      number: 2,
      kind: 'conditional',
      description: 'Else,',
      executed: true,
      subSteps: [
        {
          letter: 'a',
          kind: 'assignment',
          description: 'Let methodNames be « "valueOf", "toString" ».',
          executed: true,
          result: ['valueOf', 'toString'],
        },
      ],
    },
    {
      number: 3,
      kind: 'loop',
      description: 'For each element name of methodNames, do',
      executed: true,
      subSteps: [
        {
          letter: 'a',
          kind: 'assignment',
          description: 'Let method be ? Get(O, "valueOf").',
          executed: true,
        },
        {
          letter: 'b',
          kind: 'assignment',
          description: 'Let result be ? Call(method, O).',
          executed: true,
          result: 42,
        },
        {
          roman: 'ii',
          kind: 'return',
          description: 'If result is not an Object, return result.',
          executed: true,
          result: 42,
        },
      ],
    },
  ],
  finalValue: 42,
};

/**
 * Пример 8: ToPrimitive с Symbol.toPrimitive
 */
export const EXAMPLE_TO_PRIMITIVE_SYMBOL: TraceResult = {
  algorithmId: 'toPrimitive',
  algorithmName: 'ToPrimitive',
  algorithmDescription:
    'The abstract operation ToPrimitive takes argument input (an ECMAScript language value) and optional argument preferredType (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion.',
  algorithmUrl: 'https://262.ecma-international.org/#sec-toprimitive',
  input: { [Symbol.toPrimitive]: () => 'custom' },
  output: 'custom',
  success: true,
  steps: [
    {
      kind: 'assignment',
      description: 'Let exoticToPrim be ? GetMethod(input, %Symbol.toPrimitive%).',
      executed: true,
    },
    {
      kind: 'conditional',
      description: 'If exoticToPrim is not undefined, then',
      executed: true,
      subSteps: [
        {
          kind: 'assignment',
          description: 'Let hint be "default".',
          executed: true,
          result: 'default',
        },
        {
          kind: 'assignment',
          description: 'Let result be ? Call(exoticToPrim, input, « hint »).',
          executed: true,
          result: 'custom',
        },
        {
          kind: 'return',
          description: 'If result is not an Object, return result.',
          executed: true,
          result: 'custom',
        },
      ],
    },
  ],
  finalValue: 'custom',
};

/**
 * Экспортируем все примеры для UI testing
 */
export const ALL_EXAMPLES = {
  EXAMPLE_TO_NUMBER_NUMBER,
  EXAMPLE_TO_NUMBER_UNDEFINED,
  EXAMPLE_TO_NUMBER_STRING,
  EXAMPLE_TO_NUMBER_OBJECT,
  EXAMPLE_TO_NUMBER_SYMBOL_ERROR,
  EXAMPLE_STRING_TO_NUMBER_EMPTY,
  EXAMPLE_ORDINARY_TO_PRIMITIVE,
  EXAMPLE_TO_PRIMITIVE_SYMBOL,
};

/**
 * Возвращает пример по названию
 */
export function getExampleByName(name: keyof typeof ALL_EXAMPLES): TraceResult {
  return ALL_EXAMPLES[name];
}

/**
 * Возвращает все примеры как массив
 */
export function getAllExamples(): TraceResult[] {
  return Object.values(ALL_EXAMPLES);
}
