export type TokenContext = { nextToken?: string | null };

export type TokenDescriber = (
  raw: string | null | undefined,
  ctx?: TokenContext,
) => string | undefined;

export type Resolver = (key: string) => string | undefined;

export type DescribeStep = Resolver | { joinNext: Resolver; onlyDigits?: boolean };

export function stripEdges(
  token: string,
  { keepColon = true }: { keepColon?: boolean } = {},
): string {
  const trailing = keepColon ? /[)\]}.,]+$/ : /[)\]}.,:]+$/;
  return token.replace(/^[([{]+/, "").replace(trailing, "");
}

const isJoinStep = (step: DescribeStep): step is { joinNext: Resolver; onlyDigits?: boolean } =>
  typeof step !== "function";

export function createDescriber({
  strip = (token: string) => stripEdges(token),
  steps,
}: {
  strip?: (token: string) => string;
  steps: DescribeStep[];
}): TokenDescriber {
  return (rawToken, ctx = {}) => {
    if (!rawToken) return undefined;

    const raw = rawToken.trim();
    if (!raw) return undefined;

    const key = strip(raw);
    if (!key) return undefined;

    for (const step of steps) {
      if (isJoinStep(step)) {
        if (!(raw.endsWith(":") || key.endsWith(":")) || !ctx.nextToken) continue;
        const next = strip(ctx.nextToken.trim());
        if (!next) continue;
        if (step.onlyDigits && !/^\d+$/.test(next)) continue;
        const joined = step.joinNext(`${key}${next}`);
        if (joined) return joined;
        continue;
      }

      const answer = step(key);
      if (answer) return answer;
    }

    return undefined;
  };
}

export const fromTable =
  (table: Record<string, string>): Resolver =>
  (key) =>
    table[key];

export const fromLiterals = fromTable;
