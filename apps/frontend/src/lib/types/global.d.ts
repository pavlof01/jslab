import type { TokenBase } from "shiki";
import type { DiffKind, DiffResult } from ".";

declare module "shiki" {
  interface TokenBase {
    diffType?: DiffKind;
    prevLine?: number;
    nextLine?: number;
  }

  interface TokensResult {
    diff: DiffResult;
  }
}
