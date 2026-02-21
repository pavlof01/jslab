/**
 * ExecutorUtilities - общие утилиты для всех executors
 * Сжатые версии часто используемых операций
 */

import type { ExecutedStep, TraceResult } from '../../abstract-operations-tracer';

export class ExecutorUtilities {
  /**
   * Создает шаг возврата значения
   */
  static returns(description: string, result?: unknown): ExecutedStep {
    return {
      kind: 'return',
      description,
      executed: true,
      result,
    };
  }

  /**
   * Создает шаг присвоения
   */
  static assign(description: string, result?: unknown, nestedTrace?: TraceResult): ExecutedStep {
    const step: ExecutedStep = {
      kind: 'assignment',
      description,
      executed: true,
      result,
    };
    if (nestedTrace) {
      step.nestedTrace = nestedTrace;
    }
    return step;
  }

  /**
   * Создает пропущенный условный шаг
   */
  static skipIf(description: string, reason?: string): ExecutedStep {
    return {
      kind: 'conditional',
      description,
      executed: false,
      reason: reason || 'Condition not met',
    };
  }

  /**
   * Создает условный блок с подшагами
   */
  static ifThen(description: string, subSteps: ExecutedStep[]): ExecutedStep {
    return {
      kind: 'conditional',
      description,
      executed: true,
      subSteps,
    };
  }

  /**
   * Создает блок цикла с подшагами
   */
  static forEach(description: string, subSteps: ExecutedStep[]): ExecutedStep {
    return {
      kind: 'loop',
      description,
      executed: true,
      subSteps,
    };
  }

  /**
   * Создает шаг выброса исключения
   */
  static throw(description: string, error?: string): ExecutedStep {
    return {
      kind: 'throw',
      description,
      executed: true,
      reason: error,
    };
  }

  /**
   * Создает assertion шаг
   */
  static assert(description: string, executed = true): ExecutedStep {
    return {
      kind: 'assertion',
      description,
      executed,
      reason: executed ? undefined : 'Condition not satisfied',
    };
  }

  /**
   * Соединяет несколько ExecutedStep в один с трассировкой
   */
  static withNesting(step: ExecutedStep, nestedTrace: TraceResult): ExecutedStep {
    return {
      ...step,
      nestedTrace,
    };
  }

  /**
   * Создает группированный шаг с вложенными подшагами и возможной вложенной трассировкой
   */
  static group(
    description: string,
    subSteps: ExecutedStep[],
    nestedTrace?: TraceResult,
  ): ExecutedStep {
    const step: ExecutedStep = {
      kind: 'group',
      description,
      executed: true,
      subSteps,
    };
    if (nestedTrace) {
      step.nestedTrace = nestedTrace;
    }
    return step;
  }

  /**
   *快速создание шага с с пользовательсикми свойствами
   */
  static custom(props: Partial<ExecutedStep>): ExecutedStep {
    return {
      kind: 'operation',
      description: '',
      executed: true,
      ...props,
    };
  }
}
