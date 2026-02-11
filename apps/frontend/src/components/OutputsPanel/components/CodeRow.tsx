import { ThemedToken } from "shiki";
import TokenSpan from "./CodeToken";
import { DiffKind } from "@/lib/types";
import LineNumber from "./LineNumber";
import type { EngineKey } from "@/lib/types";

type Props = {
  tokens: ThemedToken[];
  lineNumber: number;
  engineKey: EngineKey;
};

type Span = { start: number; end: number };

function getOpcodeSpan(engineKey: EngineKey, line: string): Span | null {
  if (engineKey === "jsc") {
    const m = line.match(/^\[\s*\d+\]\s+([*]*[A-Za-z_][A-Za-z0-9_]*)/);
    if (!m) return null;
    const opcode = m[1];
    const end = m[0].length;
    const start = end - opcode.length;
    return { start, end };
  }

  return null;
}

function tokenIntersectsSpan(token: ThemedToken, span: Span): boolean {
  const start = token.offset;
  const end = token.offset + token.content.length;
  return end > span.start && start < span.end;
}

const diffKindToClass: Record<DiffKind, string> = {
  [DiffKind.Add]: "diff-add",
  [DiffKind.Del]: "diff-del",
  [DiffKind.Keep]: "diff-keep",
};

const PlainCodeRow: React.FC<Props> = ({ tokens, lineNumber, engineKey }) => {
  if (!tokens.length) return null;

  const tok = tokens[0];
  const diffKind = tokens[0].diffType;
  const diffClass = diffKind ? diffKindToClass[diffKind] : "";
  const prefix = diffKind === DiffKind.Add ? "+" : diffKind === DiffKind.Del ? "-" : " ";

  const lineText = tokens.map((t) => t.content).join("");
  const opcodeSpan = getOpcodeSpan(engineKey, lineText);

  return (
    <span
      className={diffClass}
      style={{
        whiteSpace: "pre",
        display: "inline-block",
        minHeight: "1.65em",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "1.5ch",
          textAlign: "center",
          userSelect: "none",
        }}
      >
        {prefix}
      </span>
      <LineNumber value={tok.prevLine ?? lineNumber} />
      <LineNumber value={tok.nextLine ?? ""} />
      {tokens.map((token, index) => (
        <TokenSpan key={index} token={token} nextToken={tokens[index + 1]} engineKey={engineKey} />
      ))}
    </span>
  );
};

export default PlainCodeRow;
