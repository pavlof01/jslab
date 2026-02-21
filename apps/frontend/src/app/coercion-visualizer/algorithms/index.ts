import type { AlgorithmSpec } from '../abstract-operations-tracer';
import { ToNumberAlgorithm } from './to-number';
import { StringToNumberAlgorithm } from './string-to-number';
import { ToPrimitiveAlgorithm } from './to-primitive';
import { OrdinaryToPrimitiveAlgorithm } from './ordinary-to-primitive';
import { IsCallableAlgorithm } from './is-callable';

export { ToNumberAlgorithm } from './to-number';
export { StringToNumberAlgorithm } from './string-to-number';
export { ToPrimitiveAlgorithm } from './to-primitive';
export { OrdinaryToPrimitiveAlgorithm } from './ordinary-to-primitive';
export { IsCallableAlgorithm } from './is-callable';

// Executors
export {
  ToNumberExecutor,
  StringToNumberExecutor,
  ToPrimitiveExecutor,
  OrdinaryToPrimitiveExecutor,
  TypeChecker,
  StepBuilder,
} from './executors';

// Usage examples and integration
export {
  executeAlgorithm,
  useAlgorithmTrace,
  renderTraceHTML,
  compareInputs,
  getTraceStatistics,
  EXAMPLES,
  type CoercionRequest,
  type CoercionResponse,
} from './executor-usage-examples';

// Output examples for UI testing
export {
  ALL_EXAMPLES,
  getExampleByName,
  getAllExamples,
  EXAMPLE_TO_NUMBER_NUMBER,
  EXAMPLE_TO_NUMBER_UNDEFINED,
  EXAMPLE_TO_NUMBER_STRING,
  EXAMPLE_TO_NUMBER_OBJECT,
  EXAMPLE_TO_NUMBER_SYMBOL_ERROR,
  EXAMPLE_STRING_TO_NUMBER_EMPTY,
  EXAMPLE_ORDINARY_TO_PRIMITIVE,
  EXAMPLE_TO_PRIMITIVE_SYMBOL,
} from './executor-output-examples';

/**
 * Получает все доступные алгоритмы
 */
export function getAllAlgorithms(): AlgorithmSpec[] {
  return [
    ToNumberAlgorithm.getSpec(),
    StringToNumberAlgorithm.getSpec(),
    ToPrimitiveAlgorithm.getSpec(),
    OrdinaryToPrimitiveAlgorithm.getSpec(),
    IsCallableAlgorithm.getSpec(),
  ];
}

/**
 * Получает алгоритм по id
 */
export function getAlgorithmById(id: string): AlgorithmSpec | undefined {
  return getAllAlgorithms().find((algo) => algo.id === id);
}

/**
 * Получает алгоритм по имени
 */
export function getAlgorithmByName(name: string): AlgorithmSpec | undefined {
  return getAllAlgorithms().find((algo) => algo.name === name);
}
