import { AlgorithmStep } from "../types";

export const STRING_OR_NUMERIC_EXPRESSION_STEPS: AlgorithmStep[] = [
  {
    id: "1",
    title: "Evaluate left operand",
    description: "Let lRef be ? Evaluation of leftOperand.",
  },
  {
    id: "2",
    title: "GetValue(lRef)",
    description: "Let lVal be ? GetValue(lRef).",
  },
  {
    id: "3",
    title: "Evaluate right operand",
    description: "Let rRef be ? Evaluation of rightOperand.",
  },
  {
    id: "4",
    title: "GetValue(rRef)",
    description: "Let rVal be ? GetValue(rRef).",
  },
  {
    id: "5",
    title: "ApplyStringOrNumericBinaryOperator(lVal, opText, rVal)",
    description: "Return ? ApplyStringOrNumericBinaryOperator(lVal, opText, rVal).",
    children: [
      {
        id: "5.1",
        title: 'Check "+" special case',
        description: 'If opText is "+", handle possible string concatenation or numeric path.',
        children: [
          {
            id: "5.1.a",
            title: "ToPrimitive(lVal)",
            description: "Let lPrim be ? ToPrimitive(lVal).",
          },
          {
            id: "5.1.b",
            title: "ToPrimitive(rVal)",
            description: "Let rPrim be ? ToPrimitive(rVal).",
          },
          {
            id: "5.1.c",
            title: "String concatenation branch",
            description: "If lPrim is a String or rPrim is a String: ToString(lPrim), ToString(rPrim), concatenate.",
          },
          {
            id: "5.1.d-e",
            title: "Numeric path for +",
            description: "Otherwise, set lVal = lPrim and rVal = rPrim; continue as numeric operation.",
          },
        ],
      },
      {
        id: "5.2",
        title: "Numeric operation note",
        description: "At this point, it must be a numeric operation.",
      },
      {
        id: "5.3",
        title: "ToNumeric(lVal)",
        description: "Let lNum be ? ToNumeric(lVal).",
      },
      {
        id: "5.4",
        title: "ToNumeric(rVal)",
        description: "Let rNum be ? ToNumeric(rVal).",
      },
      {
        id: "5.5",
        title: "SameType(lNum, rNum)",
        description: "If SameType(lNum, rNum) is false, throw a TypeError exception.",
      },
      {
        id: "5.6",
        title: "BigInt branch",
        description: "If lNum is a BigInt, use BigInt variant of this operation.",
      },
      {
        id: "5.7",
        title: "Number branch",
        description: "Otherwise, use Number variant of this operation.",
      },
      {
        id: "5.8",
        title: "Return result",
        description: "Return operation(lNum, rNum).",
      },
    ],
  },
];
