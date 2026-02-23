/**
 * StepBuilder - утилиты для создания ExecutedStep
 */

import type { ExecutedStep } from '../../abstract-operations-tracer';

/**
 * Расширенный набор утилит для создания структурированных шагов выполнения алгоритма
 */
export class StepBuilder {
  /**
   * Создает универсальный шаг с произвольными свойствами
   */
  static step(props: Partial<ExecutedStep>): ExecutedStep {
    return {
      kind: props.kind || 'operation',
      description: props.description || '',
      executed: props.executed !== false,
      ...props,
    };
  }

  /**
   * Создает шаг возврата значения (return)
   */
  static returnStep(description: string, result?: unknown): ExecutedStep {
    return {
      kind: 'return',
      description,
      executed: true,
      result,
    };
  }

  /**
   * Создает шаг присвоения (assignment)
   */
  static assignment(description: string, result?: unknown): ExecutedStep {
    return {
      kind: 'assignment',
      description,
      executed: true,
      result,
    };
  }

  /**
   * Создает условный шаг (conditional) с подшагами
   */
  static conditional(description: string, subSteps: ExecutedStep[]): ExecutedStep {
    return {
      kind: 'conditional',
      description,
      executed: true,
      subSteps,
    };
  }

  /**
   * Создает шаг выброса исключения (throw)
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
   * Создает пропущенный условный шаг (условие не прошло)
   * Помечает шаг как не выполненный, но включает его в трассировку
   */
  static skipCondition(description: string, reason?: string): ExecutedStep {
    return {
      kind: 'conditional',
      description,
      executed: false,
      reason: reason || 'Condition not met',
    };
  }

  /**
   * Создает пропущенный assertion шаг
   * Используется для документирования assertion'ов, которые были пропущены
   */
  static assertContinue(description: string): ExecutedStep {
    return {
      kind: 'assertion',
      description,
      executed: true,
    };
  }

  /**
   * Создает пропущенный assert для специальных случаев
   */
  static skipAssert(description: string): ExecutedStep {
    return {
      kind: 'assertion',
      description,
      executed: false,
      reason: 'Condition not applicable',
    };
  }
}
