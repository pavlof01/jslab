import type { AlgorithmSpec } from '../abstract-operations-tracer';

export class ToPrimitiveAlgorithm {
  static getSpec(): AlgorithmSpec {
    return {
      id: 'toPrimitive',
      name: 'ToPrimitive',
      url: 'https://262.ecma-international.org/#sec-toprimitive',
      description:
        'The abstract operation ToPrimitive takes argument input (an ECMAScript language value) and optional argument preferredType (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion. It converts its input argument to a non-Object type. If an object is capable of converting to more than one primitive type, it may use the optional hint preferredType to favour that type.',
      steps: [
        {
          number: 1,
          kind: 'conditional',
          description: 'If input is an Object, then',
          subSteps: [
            {
              letter: 'a',
              kind: 'assignment',
              description: 'Let exoticToPrim be ? GetMethod(input, %Symbol.toPrimitive%).',
            },
            {
              letter: 'b',
              kind: 'conditional',
              description: 'If exoticToPrim is not undefined, then',
              subSteps: [
                {
                  roman: 'i',
                  kind: 'conditional',
                  description: 'If preferredType is not present, then',
                  subSteps: [
                    {
                      number: 1,
                      kind: 'assignment',
                      description: 'Let hint be "default".',
                    },
                  ],
                },
                {
                  roman: 'ii',
                  kind: 'condition-else',
                  description: 'Else if preferredType is STRING, then',
                  subSteps: [
                    {
                      number: 1,
                      kind: 'assignment',
                      description: 'Let hint be "string".',
                    },
                  ],
                },
                {
                  roman: 'iii',
                  kind: 'condition-else',
                  description: 'Else,',
                  subSteps: [
                    {
                      number: 1,
                      kind: 'assertion',
                      description: 'Assert: preferredType is NUMBER.',
                    },
                    {
                      number: 2,
                      kind: 'assignment',
                      description: 'Let hint be "number".',
                    },
                  ],
                },
                {
                  roman: 'iv',
                  kind: 'assignment',
                  description: 'Let result be ? Call(exoticToPrim, input, « hint »).',
                },
                {
                  roman: 'v',
                  kind: 'return',
                  description: 'If result is not an Object, return result.',
                },
                {
                  roman: 'vi',
                  kind: 'throw',
                  description: 'Throw a TypeError exception.',
                },
              ],
            },
            {
              letter: 'c',
              kind: 'assignment',
              description: 'If preferredType is not present, let preferredType be NUMBER.',
            },
            {
              letter: 'd',
              kind: 'return',
              description: 'Return ? OrdinaryToPrimitive(input, preferredType).',
            },
          ],
        },
        {
          number: 2,
          kind: 'return',
          description: 'Return input.',
        },
      ],
    };
  }
}
