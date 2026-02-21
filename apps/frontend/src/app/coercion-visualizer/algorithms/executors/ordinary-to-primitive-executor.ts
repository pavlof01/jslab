/**
 * OrdinaryToPrimitive Executor
 * https://262.ecma-international.org/#sec-ordinarytoprimitive
 */

import type { ExecutedStep, TraceResult } from '../../abstract-operations-tracer';
import { StepBuilder } from './step-builder';
import { TypeChecker } from './type-checker';

/**
 * OrdinaryToPrimitive executor - преобразует объект в примитив обычным способом
 * https://262.ecma-international.org/#sec-ordinarytoprimitive
 *
 * Этот алгоритм используется когда нет кастомного Symbol.toPrimitive.
 * Порядок вызова методов зависит от hint:
 * - STRING hint: сначала toString, потом valueOf
 * - NUMBER hint (по умолчанию): сначала valueOf, потом toString
 */
export class OrdinaryToPrimitiveExecutor {
  /**
   * Выполняет алгоритм OrdinaryToPrimitive и возвращает трассировку
   * @param obj - входной объект
   * @param hint - подсказка о желаемом примитивном типе ('string', 'number', 'default')
   * @returns TraceResult с информацией о выполнении алгоритма
   */
  static execute(obj: unknown, hint: 'string' | 'number' | 'default'): TraceResult {
    const steps: ExecutedStep[] = [];

    // Шаг 1-2: Определяем методы на основе hint
    let methodNames: string[];

    if (hint === 'string') {
      const step1 = StepBuilder.conditional('If hint is STRING, then', [
        StepBuilder.assignment('Let methodNames be « "toString", "valueOf" ».', [
          'toString',
          'valueOf',
        ]),
      ]);
      steps.push(step1);
      methodNames = ['toString', 'valueOf'];
    } else {
      const step2 = StepBuilder.conditional('Else,', [
        StepBuilder.assignment('Let methodNames be « "valueOf", "toString" ».', [
          'valueOf',
          'toString',
        ]),
      ]);
      steps.push(step2);
      methodNames = ['valueOf', 'toString'];
    }

    // Шаг 3: Перебираем методы
    const loopSteps: ExecutedStep[] = [];

    if (TypeChecker.isObject(obj)) {
      const objRecord = obj as Record<string, unknown>;

      for (const methodName of methodNames) {
        const method = objRecord[methodName];

        // 3.a: Let method be ? Get(O, name).
        const getMethodStep = StepBuilder.assignment(
          `Let method be ? Get(O, "${methodName}").`,
          method,
        );
        loopSteps.push(getMethodStep);

        // 3.b: If IsCallable(method) is true, then
        if (TypeChecker.isCallable(method)) {
          const callableStep = StepBuilder.step({
            kind: 'assertion',
            description: `If IsCallable(method) is true,`,
            executed: true,
          });
          loopSteps.push(callableStep);

          try {
            const result = (method as Function).call(obj);

            const callStep = StepBuilder.assignment(
              `Let result be ? Call(method, O).`,
              result,
            );
            loopSteps.push(callStep);

            // Return if result is not an Object
            if (!TypeChecker.isObject(result)) {
              const returnStep = StepBuilder.returnStep(
                'If result is not an Object, return result.',
                result,
              );
              loopSteps.push(returnStep);

              const loopStep = StepBuilder.step({
                kind: 'loop',
                description: 'For each element name of methodNames, do',
                subSteps: loopSteps,
                executed: true,
              });
              steps.push(loopStep);

              return this.createResult(obj, result, true, steps);
            }

            // If result is an Object, continue to next method
            const continueStep = StepBuilder.step({
              kind: 'conditional',
              description: 'Result is an Object, continue to next method.',
              executed: true,
            });
            loopSteps.push(continueStep);
          } catch (error) {
            const errorStep = StepBuilder.throw(
              `Call to ${methodName} threw an error`,
              String(error),
            );
            loopSteps.push(errorStep);

            const loopStep = StepBuilder.step({
              kind: 'loop',
              description: 'For each element name of methodNames, do',
              subSteps: loopSteps,
              executed: true,
            });
            steps.push(loopStep);

            return this.createResult(
              obj,
              undefined,
              false,
              steps,
              'TypeError: Cannot convert object to primitive value',
            );
          }
        } else {
          const notCallableStep = StepBuilder.skipCondition(
            `If IsCallable(method) is true,`,
            `${methodName} is not callable`,
          );
          loopSteps.push(notCallableStep);
        }
      }
    }

    // Добавляем loop step
    if (loopSteps.length > 0) {
      const loopStep = StepBuilder.step({
        kind: 'loop',
        description: 'For each element name of methodNames, do',
        subSteps: loopSteps,
        executed: true,
      });
      steps.push(loopStep);
    }

    // Шаг 4: Throw a TypeError exception.
    const throwStep = StepBuilder.throw(
      'Throw a TypeError exception.',
      'Cannot convert object to primitive value',
    );
    steps.push(throwStep);

    return this.createResult(
      obj,
      undefined,
      false,
      steps,
      'TypeError: Cannot convert object to primitive value',
    );
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
      algorithmId: 'ordinaryToPrimitive',
      algorithmName: 'OrdinaryToPrimitive',
      algorithmDescription:
        'The abstract operation OrdinaryToPrimitive takes arguments O (an Object) and hint (STRING or NUMBER) and returns either a normal completion containing an ECMAScript language value or a throw completion.',
      input,
      output,
      success,
      steps,
      finalValue: output,
      ...(error && { error }),
    };
  }
}
