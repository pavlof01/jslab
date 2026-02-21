import type { AlgorithmSpec } from '../abstract-operations-tracer';

export class IsCallableAlgorithm {
  static getSpec(): AlgorithmSpec {
    return {
      id: 'isCallable',
      name: 'IsCallable',
      url: 'https://262.ecma-international.org/#sec-iscallable',
      description:
        'The abstract operation IsCallable takes argument argument (an ECMAScript language value) and returns a Boolean. It determines if argument is a callable function with a [[Call]] internal method.',
      steps: [
        {
          number: 1,
          kind: 'return',
          description: 'If argument is not an Object, return false.',
        },
        {
          number: 2,
          kind: 'return',
          description: 'If argument has a [[Call]] internal method, return true.',
        },
        {
          number: 3,
          kind: 'return',
          description: 'Return false.',
        },
      ],
    };
  }
}
