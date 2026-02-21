/**
 * Пример использования Algorithm Executors в API endpoint
 * 
 * Этот файл показывает, как интегрировать executors в приложение:
 * 1. Получить входные данные
 * 2. Запустить executor
 * 3. Вернуть trace на UI для отображения
 */

import {
  ToNumberExecutor,
  StringToNumberExecutor,
  ToPrimitiveExecutor,
  OrdinaryToPrimitiveExecutor,
} from './executors';
import type { TraceResult } from '../abstract-operations-tracer';

/**
 * API Request - что отправляет клиент
 */
export interface CoercionRequest {
  algorithm: 'toNumber' | 'stringToNumber' | 'toPrimitive' | 'ordinaryToPrimitive';
  input: unknown;
  hint?: 'string' | 'number' | 'default';  // Для ToPrimitive и OrdinaryToPrimitive
}

/**
 * API Response - что возвращает сервер
 */
export type CoercionResponse = TraceResult;

/**
 * Главная функция для выполнения алгоритма
 */
export function executeAlgorithm(request: CoercionRequest): CoercionResponse {
  switch (request.algorithm) {
    case 'stringToNumber':
      return StringToNumberExecutor.execute(String(request.input));

    case 'toPrimitive':
      return ToPrimitiveExecutor.execute(request.input, request.hint || 'default');

    case 'ordinaryToPrimitive':
      if (typeof request.input !== 'object' || request.input === null) {
        return {
          algorithmId: 'ordinaryToPrimitive',
          algorithmName: 'OrdinaryToPrimitive',
          algorithmDescription: 'Input must be an object',
          input: request.input,
          output: undefined,
          success: false,
          steps: [],
          error: 'Input must be an object',
        };
      }
      return OrdinaryToPrimitiveExecutor.execute(
        request.input,
        (request.hint as 'string' | 'number') || 'number',
      );

    case 'toNumber':
    default:
      return ToNumberExecutor.execute(request.input);
  }
}

/**
 * Примеры использования
 */
export const EXAMPLES = {
  toNumber: [
    {
      input: 42,
      description: 'Number - returns as-is',
    },
    {
      input: true,
      description: 'Boolean true - returns 1',
    },
    {
      input: false,
      description: 'Boolean false - returns 0',
    },
    {
      input: null,
      description: 'null - returns 0',
    },
    {
      input: undefined,
      description: 'undefined - returns NaN',
    },
    {
      input: '42',
      description: 'String "42" - uses StringToNumber',
    },
    {
      input: { valueOf: () => 42 },
      description: 'Object with valueOf - uses ToPrimitive then ToNumber',
    },
  ] as const,

  stringToNumber: [
    {
      input: '',
      description: 'Empty string - returns 0',
    },
    {
      input: '42',
      description: 'Numeric string - returns 42',
    },
    {
      input: '  42  ',
      description: 'String with spaces - returns 42',
    },
    {
      input: 'Infinity',
      description: 'Infinity string - returns Infinity',
    },
    {
      input: 'abc',
      description: 'Non-numeric string - returns NaN',
    },
  ] as const,

  toPrimitive: [
    {
      input: 42,
      description: 'Primitive - returns as-is',
    },
    {
      input: { toString: () => 'str' },
      description: 'Object - uses OrdinaryToPrimitive',
    },
    {
      input: { [Symbol.toPrimitive]: () => 'custom' },
      description: 'Object with Symbol.toPrimitive - uses it',
    },
  ] as const,

  ordinaryToPrimitive: [
    {
      input: { toString: () => 'str', valueOf: () => 42 },
      description: 'Object with both methods',
    },
    {
      input: { valueOf: () => 42 },
      description: 'Object with only valueOf',
    },
    {
      input: { toString: () => 'str' },
      description: 'Object with only toString',
    },
  ] as const,
};

/**
 * React Hook для интеграции в UI
 * 
 * Пример использования:
 * ```tsx
 * const { trace, loading, error } = useAlgorithmTrace('toNumber', 42);
 * 
 * return (
 *   <div>
 *     {loading && <p>Loading...</p>}
 *     {error && <p>Error: {error}</p>}
 *     {trace && <TraceViewer trace={trace} />}
 *   </div>
 * );
 * ```
 */
export function useAlgorithmTrace(algorithm: string, input: unknown, hint?: string) {
  // Симуляция синхронного выполнения
  try {
    const trace = executeAlgorithm({
      algorithm: algorithm as any,
      input,
      hint: hint as any,
    });

    return {
      trace,
      loading: false,
      error: null,
    };
  } catch (err) {
    return {
      trace: null,
      loading: false,
      error: String(err),
    };
  }
}

/**
 * Компонент React для отображения trace'я
 * (вспомогательный пример)
 */
export function renderTraceHTML(trace: TraceResult): string {
  const stepsHTML = trace.steps
    .map((step) => {
      const result = step.result ? `<code>${JSON.stringify(step.result)}</code>` : '';
      const nested = step.nestedTrace
        ? `<div style="margin-left: 20px; border-left: 2px solid #ccc; padding-left: 10px;">
            <strong>${step.nestedTrace.algorithmName}</strong>
            ${renderTraceHTML(step.nestedTrace)}
          </div>`
        : '';

      return `
        <div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 4px;">
          <div><strong>${step.kind}</strong></div>
          <div>${step.description}</div>
          ${result ? `<div>Result: ${result}</div>` : ''}
          ${step.reason ? `<div style="color: red;">Reason: ${step.reason}</div>` : ''}
          ${nested}
        </div>
      `;
    })
    .join('');

  return `
    <div style="font-family: monospace;">
      <h3>${trace.algorithmName}</h3>
      <div>Input: <code>${JSON.stringify(trace.input)}</code></div>
      <div>Output: <code>${JSON.stringify(trace.output)}</code></div>
      <div>Success: ${trace.success ? '✓' : '✗'}</div>
      <div style="margin-top: 20px;">
        <h4>Steps:</h4>
        ${stepsHTML}
      </div>
    </div>
  `;
}

/**
 * Функция для сравнения нескольких входов на одном алгоритме
 */
export function compareInputs(
  algorithm: 'toNumber' | 'stringToNumber' | 'toPrimitive' | 'ordinaryToPrimitive',
  inputs: unknown[],
): CoercionResponse[] {
  return inputs.map((input) =>
    executeAlgorithm({
      algorithm,
      input,
      hint: 'number',
    }),
  );
}

/**
 * Статистика для UI
 */
export function getTraceStatistics(trace: TraceResult) {
  function countSteps(steps: any[]): number {
    return steps.reduce((total, step) => {
      return total + 1 + (step.subSteps ? countSteps(step.subSteps) : 0);
    }, 0);
  }

  function countAlgorithmCalls(trace: TraceResult): string[] {
    const algorithms: string[] = [trace.algorithmId];

    for (const step of trace.steps) {
      if (step.nestedTrace) {
        algorithms.push(...countAlgorithmCalls(step.nestedTrace));
      }
      if (step.subSteps) {
        for (const subStep of step.subSteps) {
          if (subStep.nestedTrace) {
            algorithms.push(...countAlgorithmCalls(subStep.nestedTrace));
          }
        }
      }
    }

    return algorithms;
  }

  return {
    totalSteps: countSteps(trace.steps),
    algorithms: [...new Set(countAlgorithmCalls(trace))],
    success: trace.success,
    input: trace.input,
    output: trace.output,
  };
}
