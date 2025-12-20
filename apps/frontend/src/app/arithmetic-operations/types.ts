export interface AlgorithmStep {
  id: string;
  title: string;
  description?: string;
  info?: string;
  status?: "ok" | "error";
  kind?: "important" | "spec";
  pre?: string;
  post?: string;
  children?: AlgorithmStep[];
}
