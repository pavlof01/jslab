import fs from "fs/promises";
import { UsageError, type RunCommand } from "./options.js";

/**
 * Source length the gateway accepts by default (`MAX_SOURCE_LENGTH`). Only
 * used for a warning: a self-hosted gateway may be configured higher, so the
 * server stays the authority on what is too long.
 */
export const SOFT_SOURCE_LIMIT = 20_000;

export interface SourceResult {
  sourceText: string;
  /** Where it came from, for error messages. */
  origin: string;
  warnings: string[];
}

/** Read the snippet from `--code`, a file argument, or stdin. */
export async function readSource(
  command: Pick<RunCommand, "code" | "file">,
  stdin: NodeJS.ReadStream = process.stdin,
): Promise<SourceResult> {
  const { sourceText, origin } = await readRaw(command, stdin);

  if (!sourceText.trim()) throw new UsageError(`${origin} is empty — there is nothing to run`);

  const warnings =
    sourceText.length > SOFT_SOURCE_LIMIT
      ? [`source is ${sourceText.length} chars; the gateway's default limit is ${SOFT_SOURCE_LIMIT} and may reject it`]
      : [];

  return { sourceText, origin, warnings };
}

async function readRaw(
  command: Pick<RunCommand, "code" | "file">,
  stdin: NodeJS.ReadStream,
): Promise<{ sourceText: string; origin: string }> {
  if (command.code !== undefined) return { sourceText: command.code, origin: "--code" };

  if (command.file !== undefined) {
    try {
      return { sourceText: await fs.readFile(command.file, "utf8"), origin: command.file };
    } catch (err: any) {
      const reason = err?.code === "ENOENT" ? "no such file" : err?.message || "unreadable";
      throw new UsageError(`cannot read ${command.file}: ${reason}`);
    }
  }

  // Nothing to read and nothing piped in: waiting on an interactive terminal
  // would look like a hang, so say what the command was missing instead.
  if (stdin.isTTY) {
    throw new UsageError("no source: pass a file, use --code \"<js>\", or pipe a snippet on stdin");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(Buffer.from(chunk));
  return { sourceText: Buffer.concat(chunks).toString("utf8"), origin: "stdin" };
}
