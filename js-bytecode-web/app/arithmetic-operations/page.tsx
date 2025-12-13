"use client";

import { Box, Input, Text } from "@chakra-ui/react";
import { AlgorithmStepList } from "./components/AlgorithmStepList/AlgorithmStepList";
import { STRING_OR_NUMERIC_EXPRESSION_STEPS } from "./algorithms/evaluateStringOrNumericBinaryExpression";

export type ParsedExpression = {
  left: any;
  op: string;
  right: any;
};

const OPERATORS = [">>>", "<<", ">>", "**", "+", "-", "*", "/", "%", "&", "|", "^"];

/**
 * Парсер бинарного выражения вида left op right,
 * где левая и правая части — валидные JS-выражения.
 * Работает без пробелов: 1+1, []+{}, new String(1)+new Number(1)
 */
export function parseBinaryExpression(input: string): ParsedExpression {
  const opInfo = findTopLevelOperator(input);

  if (!opInfo) {
    throw new Error(`No top-level operator found in expression: ${input}`);
  }

  const { op, index } = opInfo;

  const leftStr = input.slice(0, index);
  const rightStr = input.slice(index + op.length);

  return {
    left: evaluateJS(leftStr.trim()),
    op,
    right: evaluateJS(rightStr.trim()),
  };
}

/**
 * Находит оператор, который расположен на верхнем уровне вложенности.
 */
function findTopLevelOperator(expr: string): { op: string; index: number } | null {
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;

  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];

    // следим за вложенностью
    if (c === "(") depthParen++;
    else if (c === ")") depthParen--;
    else if (c === "{") depthBrace++;
    else if (c === "}") depthBrace--;
    else if (c === "[") depthBracket++;
    else if (c === "]") depthBracket--;

    // Только когда мы на топ уровне — depth = 0
    if (depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      for (const op of OPERATORS) {
        if (expr.startsWith(op, i)) {
          return { op, index: i };
        }
      }
    }
  }

  return null;
}

/**
 * Из строки делает JS-значение через безопасный конструктор Function.
 */
function evaluateJS(code: string): any {
  try {
    return Function(`"use strict"; return (${code});`)();
  } catch (e) {
    throw new Error(`Failed to evaluate value: ${code}\n${e}`);
  }
}

export default function Page() {
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    // const [lVal, op, rVal] = newValue.trim().replaceAll(" ", "").split("");
    // console.log({ lVal, op, rVal });
    const parsed = parseBinaryExpression(newValue);
    const evalRes = eval(`${parsed.left} ${parsed.op} ${parsed.right}`); // to trigger possible errors

    console.log("Parsed expression:", { ...parsed, evalRes });
  };

  return (
    <Box p={4}>
      <Text fontSize="lg" fontWeight="bold" mb={3}>
        EvaluateStringOrNumericBinaryExpression — Steps
      </Text>

      <Input onChange={handleValueChange} />

      <AlgorithmStepList steps={STRING_OR_NUMERIC_EXPRESSION_STEPS} />
    </Box>
  );
}
