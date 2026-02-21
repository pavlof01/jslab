import type { AlgorithmSpec } from "../abstract-operations-tracer";

export class OrdinaryToPrimitiveAlgorithm {
  static getSpec(): AlgorithmSpec {
    return {
      id: "ordinaryToPrimitive",
      name: "OrdinaryToPrimitive",
      url: "https://262.ecma-international.org/#sec-ordinarytoprimitive",
      description:
        "The abstract operation OrdinaryToPrimitive takes arguments O (an Object) and hint (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion.",
      steps: [
        {
          number: 1,
          kind: "conditional",
          description: "If hint is STRING, then",
          subSteps: [
            {
              letter: "a",
              kind: "assignment",
              description: 'Let methodNames be « "toString", "valueOf" ».',
            },
          ],
        },
        {
          number: 2,
          kind: "condition-else",
          description: "Else,",
          subSteps: [
            {
              letter: "a",
              kind: "assignment",
              description: 'Let methodNames be « "valueOf", "toString" ».',
            },
          ],
        },
        {
          number: 3,
          kind: "loop",
          description: "For each element name of methodNames, do",
          subSteps: [
            {
              letter: "a",
              kind: "assignment",
              description: "Let method be ? Get(O, name).",
            },
            {
              letter: "b",
              kind: "conditional",
              description: "If IsCallable(method) is true, then",
              subSteps: [
                {
                  roman: "i",
                  kind: "assignment",
                  description: "Let result be ? Call(method, O).",
                },
                {
                  roman: "ii",
                  kind: "return",
                  description: "If result is not an Object, return result.",
                },
              ],
            },
          ],
        },
        {
          number: 4,
          kind: "throw",
          description: "Throw a TypeError exception.",
        },
      ],
    };
  }
}
