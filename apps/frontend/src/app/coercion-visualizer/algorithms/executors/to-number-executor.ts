/**
 * ToNumber Executor
 * https://262.ecma-international.org/#sec-tonumber
 */

import type { ExecutedStep, TraceResult } from '../../abstract-operations-tracer';
import { StepBuilder } from './step-builder';
import { TypeChecker } from './type-checker';
import { StringToNumberExecutor } from './string-to-number-executor';
import { ToPrimitiveExecutor } from './to-primitive-executor';

/**
 * ToNumber executor - преобразует любое значение в число
 * https://262.ecma-international.org/#sec-tonumber
 *
 * Этот алгоритм является главной функцией для преобразования любого значения в число.
 * Он обрабатывает все типы значений и использует другие алгоритмы для сложных случаев.
 */
export class ToNumberExecutor {
  /**
   * Выполняет алгоритм ToNumber и возвращает трассировку
   * @param argument - входное значение (любого типа)
   * @returns TraceResult с информацией о выполнении алгоритма
   */
  static execute(argument: unknown): TraceResult {
    const steps: ExecutedStep[] = [];

    // Шаг 1: If argument is a Number, return argument.
    if (typeof argument === 'number') {
      const step1 = StepBuilder.returnStep('If argument is a Number, return argument.', argument);
      steps.push(step1);

      return this.createResult(argument, argument, true, steps);
    } else {
      const step1Skip = StepBuilder.skipCondition(
        'If argument is a Number, return argument.',
        `argument is ${typeof argument}, not Number`,
      );
      steps.push(step1Skip);
    }

    // Шаг 2: If argument is either a Symbol or a BigInt, throw a TypeError exception.
    if (TypeChecker.isSymbolOrBigInt(argument)) {
      const step2 = StepBuilder.throw(
        'If argument is either a Symbol or a BigInt, throw a TypeError exception.',
        'Cannot convert Symbol or BigInt to number',
      );
      steps.push(step2);

      return this.createResult(
        argument,
        undefined,
        false,
        steps,
        'TypeError: Cannot convert Symbol or BigInt to number',
      );
    } else {
      const step2Skip = StepBuilder.skipCondition(
        'If argument is either a Symbol or a BigInt, throw a TypeError exception.',
        `argument is not Symbol or BigInt`,
      );
      steps.push(step2Skip);
    }

    // Шаг 3: If argument is undefined, return NaN.
    if (argument === undefined) {
      const step3 = StepBuilder.returnStep('If argument is undefined, return NaN.', NaN);
      steps.push(step3);

      return this.createResult(argument, NaN, true, steps);
    } else {
      const step3Skip = StepBuilder.skipCondition(
        'If argument is undefined, return NaN.',
        `argument is not undefined: ${String(argument)}`,
      );
      steps.push(step3Skip);
    }

    // Шаг 4: If argument is either null or false, return +0𝔽.
    if (argument === null || argument === false) {
      const step4 = StepBuilder.returnStep(
        'If argument is either null or false, return +0𝔽.',
        0,
      );
      steps.push(step4);

      return this.createResult(argument, 0, true, steps);
    } else {
      const step4Skip = StepBuilder.skipCondition(
        'If argument is either null or false, return +0𝔽.',
        `argument is not null or false: ${String(argument)}`,
      );
      steps.push(step4Skip);
    }

    // Шаг 5: If argument is true, return 1𝔽.
    if (argument === true) {
      const step5 = StepBuilder.returnStep('If argument is true, return 1𝔽.', 1);
      steps.push(step5);

      return this.createResult(argument, 1, true, steps);
    } else {
      const step5Skip = StepBuilder.skipCondition(
        'If argument is true, return 1𝔽.',
        `argument is not true: ${String(argument)}`,
      );
      steps.push(step5Skip);
    }

    // Шаг 6: If argument is a String, return StringToNumber(argument).
    if (typeof argument === 'string') {
      const step6Assignment = StepBuilder.assignment(
        'If argument is a String, call StringToNumber(argument).',
        argument,
      );
      steps.push(step6Assignment);

      const stringToNumberResult = StringToNumberExecutor.execute(argument);
      const step6Return = StepBuilder.step({
        kind: 'return',
        description: 'Return StringToNumber(argument).',
        executed: true,
        result: stringToNumberResult.finalValue,
        nestedTrace: stringToNumberResult,
      });
      steps.push(step6Return);

      return this.createResult(argument, stringToNumberResult.finalValue, true, steps);
    } else {
      const step6Skip = StepBuilder.skipCondition(
        'If argument is a String, return StringToNumber(argument).',
        `argument is ${typeof argument}, not String`,
      );
      steps.push(step6Skip);
    }

    // Шаг 7: Assert: argument is an Object.
    const step7 = StepBuilder.assertContinue('Assert: argument is an Object.');
    steps.push(step7);

    // Шаг 8: Let primValue be ? ToPrimitive(argument, NUMBER).
    const toPrimitiveResult = ToPrimitiveExecutor.execute(argument, 'number');
    const step8 = StepBuilder.assignment(
      'Let primValue be ? ToPrimitive(argument, NUMBER).',
      toPrimitiveResult.finalValue,
    );
    step8.nestedTrace = toPrimitiveResult;
    steps.push(step8);

    // Шаг 9: Assert: primValue is not an Object.
    const step9 = StepBuilder.assertContinue('Assert: primValue is not an Object.');
    steps.push(step9);

    // Шаг 10: Return ? ToNumber(primValue).
    const recursiveResult = ToNumberExecutor.execute(toPrimitiveResult.finalValue);
    const step10 = StepBuilder.step({
      kind: 'return',
      description: 'Return ? ToNumber(primValue).',
      executed: true,
      result: recursiveResult.finalValue,
      nestedTrace: recursiveResult,
    });
    steps.push(step10);

    return this.createResult(argument, recursiveResult.finalValue, recursiveResult.success, steps);
  }

  /**
   * Вспомогательный метод для создания TraceResult
   */
  private static createResult(
    input: unknown,
    output: unknown,
    success: boolean,
    steps: ExecutedStep[],
    error?: string,
  ): TraceResult {
    return {
      algorithmId: 'toNumber',
      algorithmName: 'ToNumber',
      algorithmDescription:
        'The abstract operation ToNumber takes argument argument (an ECMAScript language value) and returns either a normal completion containing a Number or a throw completion. It converts argument to a value of type Number.',
      input,
      output,
      success,
      steps,
      finalValue: output,
      ...(error && { error }),
    };
  }
}
