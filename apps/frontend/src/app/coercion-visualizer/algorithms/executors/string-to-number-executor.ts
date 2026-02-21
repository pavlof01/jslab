/**
 * StringToNumber Executor
 * https://262.ecma-international.org/#sec-stringtonumber
 */

import type { ExecutedStep, TraceResult } from '../../abstract-operations-tracer';
import { StepBuilder } from './step-builder';

/**
 * StringToNumber executor - преобразует строку в число согласно ECMA-262
 * https://262.ecma-international.org/#sec-stringtonumber
 *
 * Этот алгоритм берет строку и возвращает число в соответствии с правилами спецификации.
 * Поддерживает:
 * - пустые строки (возвращают 0)
 * - строки "Infinity" и "-Infinity"
 * - числовые строки
 * - возвращает NaN для невалидных строк
 */
export class StringToNumberExecutor {
  /**
   * Выполняет алгоритм StringToNumber и возвращает трассировку шагов
   * @param str - входная строка
   * @returns TraceResult с информацией о выполнении алгоритма
   */
  static execute(str: string): TraceResult {
    const steps: ExecutedStep[] = [];

    // Шаг 1: Let literal be ParseText(str, StringNumericLiteral).
    const parseStep = StepBuilder.assignment(
      'Let literal be ParseText(str, StringNumericLiteral).',
      str,
    );
    steps.push(parseStep);

    // Парсим строку
    const trimmed = String(str).trim();
    let result: number;

    // Шаг 2: Check for empty string
    if (trimmed === '') {
      const emptyStep = StepBuilder.assignment(
        'If input string is empty or contains only whitespace, return 0.',
        0,
      );
      steps.push(emptyStep);
      result = 0;
    } else if (trimmed === 'Infinity') {
      const infStep = StepBuilder.assignment(
        'If input string is "Infinity", return +Infinity.',
        Infinity,
      );
      steps.push(infStep);
      result = Infinity;
    } else if (trimmed === '+Infinity') {
      const infStep = StepBuilder.assignment(
        'If input string is "+Infinity", return +Infinity.',
        Infinity,
      );
      steps.push(infStep);
      result = Infinity;
    } else if (trimmed === '-Infinity') {
      const infStep = StepBuilder.assignment(
        'If input string is "-Infinity", return -Infinity.',
        -Infinity,
      );
      steps.push(infStep);
      result = -Infinity;
    } else {
      const parsed = Number(trimmed);
      result = parsed;

      if (!isNaN(result)) {
        const successStep = StepBuilder.assignment(
          'Parse numeric string and return the Number value.',
          result,
        );
        steps.push(successStep);
      }
    }

    // Шаг 3: If literal is a List of errors, return NaN.
    if (isNaN(result) && trimmed !== '') {
      const errorStep = StepBuilder.returnStep(
        'If literal is a List of errors, return NaN.',
        NaN,
      );
      steps.push(errorStep);

      return this.createResult(str, NaN, true, steps);
    }

    // Шаг 4: Return the StringNumericValue of literal.
    const returnStep = StepBuilder.returnStep(
      'Return the StringNumericValue of literal.',
      result,
    );
    steps.push(returnStep);

    return this.createResult(str, result, true, steps);
  }

  /**
   * Вспомогательный метод для создания TraceResult
   */
  private static createResult(
    input: string,
    output: number,
    success: boolean,
    steps: ExecutedStep[],
  ): TraceResult {
    return {
      algorithmId: 'stringToNumber',
      algorithmName: 'StringToNumber',
      algorithmDescription:
        'The abstract operation StringToNumber takes argument str (a String) and returns a Number.',
      input,
      output,
      success,
      steps,
      finalValue: output,
    };
  }
}
