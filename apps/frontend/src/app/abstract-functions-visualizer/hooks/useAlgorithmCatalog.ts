import * as React from "react";
import { type Algorithm } from "@/app/abstract-functions-visualizer/spec-runner";

interface CatalogData {
  algoById: Map<string, Algorithm>;
}

// Minimal ToNumber algorithm for tracing
const toNumberAlgorithm: Algorithm = {
  id: "ToNumber",
  title: "ToNumber",
  params: ["argument"],
  body: [],
};

export function useAlgorithmCatalog(): CatalogData {
  const algoById = React.useMemo(
    () => new Map<string, Algorithm>([["ToNumber", toNumberAlgorithm]]),
    [],
  );

  return { algoById };
}
