import type { AlgorithmSpec } from '../abstract-operations-tracer';

export class ToNumberAlgorithm {
  static getSpec(): AlgorithmSpec {
    return {
      id: 'toNumber',
      name: 'ToNumber',
      section: '7.1.4',
      url: 'https://262.ecma-international.org/#sec-tonumber',
      description:
        'The abstract operation ToNumber takes argument argument (an ECMAScript language value) and returns either a normal completion containing a Number or a throw completion. It converts argument to a value of type Number.',
      steps: [
        {
          number: 1,
          kind: 'return',
          description: 'If argument is a Number, return argument.',
        },
        {
          number: 2,
          kind: 'throw',
          description: 'If argument is either a Symbol or a BigInt, throw a TypeError exception.',
        },
        {
          number: 3,
          kind: 'return',
          description: 'If argument is undefined, return NaN.',
        },
        {
          number: 4,
          kind: 'return',
          description: 'If argument is either null or false, return +0𝔽.',
        },
        {
          number: 5,
          kind: 'return',
          description: 'If argument is true, return 1𝔽.',
        },
        {
          number: 6,
          kind: 'return',
          description: 'If argument is a String, return StringToNumber(argument).',
        },
        {
          number: 7,
          kind: 'assertion',
          description: 'Assert: argument is an Object.',
        },
        {
          number: 8,
          kind: 'assignment',
          description: 'Let primValue be ? ToPrimitive(argument, NUMBER).',
        },
        {
          number: 9,
          kind: 'assertion',
          description: 'Assert: primValue is not an Object.',
        },
        {
          number: 10,
          kind: 'return',
          description: 'Return ? ToNumber(primValue).',
        },
      ],
    };
  }
}
