/**
 * ToPrimitive Executor
 * https://262.ecma-international.org/#sec-toprimitive
 */

import type { ExecutedStep, TraceResult } from '../../abstract-operations-tracer';
import { StepBuilder } from './step-builder';
import { TypeChecker } from './type-checker';
import { OrdinaryToPrimitiveExecutor } from './ordinary-to-primitive-executor';

/**
 * ToPrimitive executor - главный алгоритм преобразования значения в примитив
 * https://262.ecma-international.org/#sec-toprimitive
 *
 * Этот алгоритм является главной точкой входа для преобразования значений в примитивы.
 * Он проверяет наличие кастомного Symbol.toPrimitive, а если его нет,
 * падает на OrdinaryToPrimitive для обработки методов toString/valueOf.
 */
export class ToPrimitiveExecutor {
  /**
   * Выполняет алгоритм ToPrimitive и возвращает трассировку
   * @param input - входное значение (любого типа)
   * @param preferredType - предпочитаемый примитивный тип ('string', 'number', 'default')
   * @returns TraceResult с информацией о выполнении алгоритма
   */
  static execute(
    input: unknown,
    preferredType?: 'string' | 'number' | 'default',
  ): TraceResult {
    const steps: ExecutedStep[] = [];

    // Шаг 1: If input is an Object, then
    if (TypeChecker.isObject(input)) {
      const objRecord = input as Record<string | symbol, unknown>;

      // 1.a: Let exoticToPrim be ? GetMethod(input, %Symbol.toPrimitive%).
      const toPrimitiveMethod = (objRecord as any)[Symbol.toPrimitive];
      const getMethodStep = StepBuilder.assignment(
        'Let exoticToPrim be ? GetMethod(input, %Symbol.toPrimitive%).',
        toPrimitiveMethod,
      );
      steps.push(getMethodStep);

      // 1.b: If exoticToPrim is not undefined, then
      if (toPrimitiveMethod !== undefined) {
        const conditionalSteps: ExecutedStep[] = [];

        // Определяем hint
        let hint: string;

        if (preferredType === undefined) {
          const hintStep1 = StepBuilder.assignment('Let hint be "default".', 'default');
          conditionalSteps.push(hintStep1);
          hint = 'default';
        } else if (preferredType === 'string') {
          const hintStep2 = StepBuilder.assignment('Let hint be "string".', 'string');
          conditionalSteps.push(hintStep2);
          hint = 'string';
        } else {
          const hintStep3a = StepBuilder.assertContinue('Assert: preferredType is NUMBER.');
          const hintStep3b = StepBuilder.assignment('Let hint be "number".', 'number');
          conditionalSteps.push(hintStep3a);
          conditionalSteps.push(hintStep3b);
          hint = 'number';
        }

        // Call exoticToPrim
        try {
          const result = (toPrimitiveMethod as Function).call(input, hint);

          const callStep = StepBuilder.assignment(
            'Let result be ? Call(exoticToPrim, input, « hint »).',
            result,
          );
          conditionalSteps.push(callStep);

          // If result is not an Object, return result
          if (!TypeChecker.isObject(result)) {
            const returnStep = StepBuilder.returnStep(
              'If result is not an Object, return result.',
              result,
            );
            conditionalSteps.push(returnStep);

            const outerConditional = StepBuilder.conditional(
              'If exoticToPrim is not undefined, then',
              conditionalSteps,
            );
            steps.push(outerConditional);

            return this.createResult(input, result, true, steps);
          }

          // Throw TypeError
          const throwStep = StepBuilder.throw(
            'Throw a TypeError exception.',
            'ToPrimitive Symbol.toPrimitive returned an object',
          );
          conditionalSteps.push(throwStep);
        } catch (error) {
          const throwStep = StepBuilder.throw(
            'Throw a TypeError exception.',
            String(error),
          );
          conditionalSteps.push(throwStep);
        }

        const outerConditional = StepBuilder.conditional(
          'If exoticToPrim is not undefined, then',
          conditionalSteps,
        );
        steps.push(outerConditional);

        return this.createResult(input, undefined, false, steps, 'TypeError');
      } else {
        const skipToPrimStep = StepBuilder.skipCondition(
          'If exoticToPrim is not undefined, then',
          'No Symbol.toPrimitive method defined, using OrdinaryToPrimitive',
        );
        steps.push(skipToPrimStep);
      }

      // 1.c: If preferredType is not present, let preferredType be NUMBER.
      if (preferredType === undefined) {
        const preferredTypeStep = StepBuilder.assignment(
          'If preferredType is not present, let preferredType be NUMBER.',
          'NUMBER',
        );
        steps.push(preferredTypeStep);
      } else {
        const skipPreferredStep = StepBuilder.skipCondition(
          'If preferredType is not present, let preferredType be NUMBER.',
          `preferredType is already set to "${preferredType}"`,
        );
        steps.push(skipPreferredStep);
      }

      // 1.d: Return ? OrdinaryToPrimitive(input, preferredType).
      const ordinaryResult = OrdinaryToPrimitiveExecutor.execute(
        input,
        preferredType === 'string' ? 'string' : 'number',
      );

      const returnOrdinaryStep = StepBuilder.step({
        kind: 'return',
        description: 'Return ? OrdinaryToPrimitive(input, preferredType).',
        executed: true,
        result: ordinaryResult.finalValue,
        nestedTrace: ordinaryResult,
      });
      steps.push(returnOrdinaryStep);

      return this.createResult(
        input,
        ordinaryResult.finalValue,
        ordinaryResult.success,
        steps,
      );
    } else {
      // Шаг 1 не выполнен - input не объект
      const skipObjectCheckStep = StepBuilder.skipCondition(
        'If input is an Object, then',
        `input is ${typeof input}, not Object`,
      );
      steps.push(skipObjectCheckStep);

      // Шаг 2: Return input (if it's a primitive)
      const returnStep = StepBuilder.returnStep('Return input.', input);
      steps.push(returnStep);

      return this.createResult(input, input, true, steps);
    }
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
      algorithmId: 'toPrimitive',
      algorithmName: 'ToPrimitive',
      algorithmDescription:
        'The abstract operation ToPrimitive takes argument input (an ECMAScript language value) and optional argument preferredType (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion.',
      algorithmUrl: 'https://262.ecma-international.org/#sec-toprimitive',
      input,
      output,
      success,
      steps,
      finalValue: output,
      ...(error && { error }),
    };
  }
}
