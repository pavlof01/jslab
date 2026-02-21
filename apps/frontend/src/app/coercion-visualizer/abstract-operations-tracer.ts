// Abstract Operations Tracer - универсальный трассировщик для алгоритмов
// Работает с любой структурой алгоритма из спецификации

export interface AlgorithmStep {
  kind: string;
  description: string;
  number?: string | number;
  letter?: string;
  roman?: string;
  subSteps?: AlgorithmStep[];
}

export interface AlgorithmSpec {
  id: string;
  name: string;
  description: string;
  section?: string;
  url?: string;
  steps: AlgorithmStep[];
}

export type JSValue = 
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'null' }
  | { type: 'undefined' }
  | { type: 'symbol'; value: string }
  | { type: 'bigint'; value: string }
  | { type: 'object'; value: Record<string, unknown> }
  | { type: 'function'; name: string };

export interface ExecutedStep {
  number?: number | string;
  letter?: string;
  roman?: string;
  kind: string;
  description: string;
  executed: boolean;
  result?: unknown;
  reason?: string;
  subSteps?: ExecutedStep[];
  nestedTrace?: TraceResult; // Трассировка вложенного алгоритма
}

export interface TraceResult {
  algorithmId: string;
  algorithmName: string;
  algorithmDescription: string;
  algorithmSection?: string;
  algorithmUrl?: string;
  input: unknown;
  output?: unknown;
  success: boolean;
  steps: ExecutedStep[];
  finalValue?: unknown;
  error?: string;
}

export class AbstractOperationTracer {
  /**
   * Трассирует выполнение алгоритма по его спецификации и входным данным
   * @param algorithm - структура алгоритма из JSON спеки
   * @param input - входные данные для алгоритма
   * @param allAlgorithms - все доступные алгоритмы для поддержки рекурсивных вызовов
   * @param context - пользовательский контекст для вычисления условий (опционально)
   */
  static trace(
    algorithm: AlgorithmSpec,
    input: unknown,
    allAlgorithms: AlgorithmSpec[],
    context?: Record<string, unknown>,
  ): TraceResult {
    const steps = this.processSteps(algorithm.steps, input, allAlgorithms, context || {});

    return {
      algorithmId: algorithm.id,
      algorithmName: algorithm.name,
      algorithmDescription: algorithm.description,
      ...(algorithm.section && { algorithmSection: algorithm.section }),
      ...(algorithm.url && { algorithmUrl: algorithm.url }),
      input,
      success: true,
      steps,
    };
  }

  /**
   * Обрабатывает шаги алгоритма рекурсивно
   */
  private static processSteps(
    algorithmSteps: AlgorithmStep[],
    input: unknown,
    allAlgorithms: AlgorithmSpec[],
    context: Record<string, unknown>,
  ): ExecutedStep[] {
    const executedSteps: ExecutedStep[] = [];

    for (const step of algorithmSteps) {
      const executedStep = this.processStep(step, input, allAlgorithms, context);
      executedSteps.push(executedStep);

      // Если шаг - return или throw, можно остановить выполнение
      if (step.kind === 'return' || step.kind === 'throw') {
        // В реальном сценарии здесь был бы выход из функции
        // Но мы продолжаем трассировку всех шагов для визуализации
      }
    }

    return executedSteps;
  }

  /**
   * Парсит вызов алгоритма из описания шага
   * Ищет паттерны вроде "AlgorithmName(arg)" или "? AlgorithmName(arg)"
   */
  private static parseAlgorithmCall(description: string): { name: string; args: string } | null {
    // Паттерн: имя алгоритма начинается с большой буквы, за ним скобки с аргументами
    const match = description.match(/([A-Z][a-zA-Z]*)\s*\((.*?)\)/);
    if (match) {
      return {
        name: match[1],
        args: match[2],
      };
    }
    return null;
  }

  /**
   * Находит алгоритм по имени в списке всех алгоритмов
   */
  private static findAlgorithmByName(
    name: string,
    allAlgorithms: AlgorithmSpec[],
  ): AlgorithmSpec | undefined {
    // Пытаемся найти по точному имени, затем по id (camelCase версии)
    return allAlgorithms.find(
      (algo) =>
        algo.name === name ||
        algo.id === this.nameToId(name),
    );
  }

  /**
   * Конвертирует название алгоритма в id (CamelCase -> camelCase)
   */
  private static nameToId(name: string): string {
    return name.charAt(0).toLowerCase() + name.slice(1);
  }

  /**
   * Обрабатывает один шаг
   */
  private static processStep(
    step: AlgorithmStep,
    input: unknown,
    allAlgorithms: AlgorithmSpec[],
    context: Record<string, unknown>,
  ): ExecutedStep {
    // Проверяем, содержит ли описание вызов другого алгоритма
    const algorithmCall = this.parseAlgorithmCall(step.description);
    let nestedTrace: TraceResult | undefined;

    if (algorithmCall) {
      const calledAlgorithm = this.findAlgorithmByName(algorithmCall.name, allAlgorithms);
      
      if (calledAlgorithm) {
        // Рекурсивно трассируем вложенный алгоритм
        // Передаем аргумент вызова как input для вложенного алгоритма
        nestedTrace = this.trace(calledAlgorithm, algorithmCall.args, allAlgorithms, context);
      }
    }

    const executedStep: ExecutedStep = {
      ...('number' in step && typeof (step as any).number === 'number' || typeof (step as any).number === 'string'
        ? { number: (step as any).number }
        : {}),
      ...('letter' in step && typeof (step as any).letter === 'string' ? { letter: (step as any).letter } : {}),
      ...('roman' in step && typeof (step as any).roman === 'string' ? { roman: (step as any).roman } : {}),
      kind: step.kind,
      description: step.description,
      executed: true, // По умолчанию шаг выполнен
      ...(nestedTrace && { nestedTrace }),
    };

    // Обрабатываем подшаги рекурсивно, если они есть
    if (step.subSteps && step.subSteps.length > 0) {
      executedStep.subSteps = this.processSteps(step.subSteps, input, allAlgorithms, context);
    }

    return executedStep;
  }
}
