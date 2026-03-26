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
