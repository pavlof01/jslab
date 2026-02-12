import type { Expr, Instr } from "@/app/coercion-visualizer/spec-runner";
import { formatSpecValue, type NodePath } from "@/app/coercion-visualizer/traceModel";

export type SpecLine = {
  nodePath?: NodePath;
  text: string;
  indent: number;
  kind: "instr" | "branch";
  instr?: Instr;
};

export function prettyExpr(expr: Expr, depth = 0): string {
  if (depth > 2) return "…";
  if ("var" in expr) return expr.var;
  if ("lit" in expr) return formatSpecValue(expr.lit);
  if (expr.op === "call") {
    const args = expr.args ?? [];
    const shown = args.slice(0, 3).map((a) => prettyExpr(a, depth + 1));
    const inner = shown.join(", ");
    const suffix = args.length > 3 ? ", …" : "";
    return "algo" in expr ? `${expr.algo}(${inner}${suffix})` : `call(${inner}${suffix})`;
  }
  if (expr.op === "ifExpr") {
    if ("cond" in expr && "then" in expr && "else" in expr) {
      const cond = prettyExpr(expr.cond, depth + 1);
      const t = prettyExpr(expr.then, depth + 1);
      const f = prettyExpr(expr.else, depth + 1);
      return `if (${cond}) then (${t}) else (${f})`;
    }
    return "ifExpr(…)";
  }
  const args = "args" in expr ? (expr.args ?? []) : [];
  const shown = args.slice(0, 3).map((a) => prettyExpr(a, depth + 1));
  const inner = shown.join(", ");
  const suffix = args.length > 3 ? ", …" : "";
  return `${expr.op}(${inner}${suffix})`;
}

export function collectCallAlgos(expr: Expr, out: string[]) {
  if ("var" in expr || "lit" in expr) return;
  if (expr.op === "call") {
    if ("algo" in expr) out.push(expr.algo);
    const args = "args" in expr ? (expr.args ?? []) : [];
    for (const arg of args) collectCallAlgos(arg, out);
    return;
  }
  if (expr.op === "ifExpr") {
    if ("cond" in expr && "then" in expr && "else" in expr) {
      collectCallAlgos(expr.cond, out);
      collectCallAlgos(expr.then, out);
      collectCallAlgos(expr.else, out);
    }
    return;
  }
  if ("args" in expr && expr.args) {
    for (const arg of expr.args) collectCallAlgos(arg, out);
  }
}

export function getLinePalette(line: SpecLine): string {
  if (line.kind !== "instr" || !line.instr) return "gray";
  if (line.instr.op === "let") return "blue";
  if (line.instr.op === "if") return "purple";
  return "green"; // return
}

export function flattenInstrs(body: Instr[], basePath: NodePath, indent: number): SpecLine[] {
  const lines: SpecLine[] = [];

  for (let i = 0; i < body.length; i++) {
    const instr = body[i];
    const nodePath: NodePath = [...basePath, i];

    if (instr.op === "if") {
      lines.push({
        nodePath,
        text: instr.hint ?? `If (${prettyExpr(instr.cond)}) …`,
        indent,
        kind: "instr",
        instr,
      });
      lines.push({ text: "then", indent: indent + 1, kind: "branch" });
      lines.push(...flattenInstrs(instr.then, [...nodePath, "then"], indent + 2));
      lines.push({ text: "else", indent: indent + 1, kind: "branch" });
      lines.push(...flattenInstrs(instr.else, [...nodePath, "else"], indent + 2));
      continue;
    }

    if (instr.op === "let") {
      lines.push({
        nodePath,
        text: instr.hint ?? `Let ${instr.name} be ${prettyExpr(instr.expr)}.`,
        indent,
        kind: "instr",
        instr,
      });
      continue;
    }

    if (instr.op === "return") {
      lines.push({
        nodePath,
        text: instr.hint ?? `Return ${prettyExpr(instr.expr)}.`,
        indent,
        kind: "instr",
        instr,
      });
      continue;
    }

    const _never: never = instr;
    throw new Error(`Unknown instruction: ${String(_never)}`);
  }

  return lines;
}

