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
  nestedTrace?: TraceResult; // Trace of the nested algorithm
  varName?: string; // Name of the variable receiving the call result
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
