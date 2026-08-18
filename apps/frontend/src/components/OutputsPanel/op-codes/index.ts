import { EngineKey } from "@/lib/types";

import { describeToken as describeHermesToken } from "./hermes-opcodes";
import { describeToken as describeJscToken } from "./jsc-opcodes";
import { describeToken as describeSmToken } from "./spidermonkey-opcodes";
import { describeToken as describeV8Token } from "./v8-opcodes";
import type { TokenDescriber } from "./resolver";

export type { TokenDescriber, TokenContext } from "./resolver";

export const TOKEN_DESCRIBERS: Record<EngineKey, TokenDescriber> = {
  [EngineKey.v8]: describeV8Token,
  [EngineKey.jsc]: describeJscToken,
  [EngineKey.hermes]: describeHermesToken,
  [EngineKey.sm]: describeSmToken,
};

export function describeEngineToken(
  engine: EngineKey,
  raw: string | null | undefined,
  nextToken: string | null = null,
): string | undefined {
  return TOKEN_DESCRIBERS[engine](raw, { nextToken });
}
