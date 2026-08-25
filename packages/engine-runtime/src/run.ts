import { spawn, type SpawnOptions } from "child_process";
import { StringDecoder } from "string_decoder";

/**
 * Spawning half of the engine runtime: one child process, one wall-clock
 * budget, one output budget. Kept out of `index.ts` (and off the package's
 * public exports) so the process-level behaviour can be tested directly.
 */

export type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
  spawnError?: boolean;
};

/**
 * Decode at most `maxBytes` of a buffer. StringDecoder holds back a trailing
 * incomplete UTF-8 sequence rather than emitting U+FFFD, so cutting the stream
 * mid-character costs that character, not the tail of the line.
 */
function decodeCapped(buf: Buffer, maxBytes: number): string {
  return new StringDecoder("utf8").write(buf.subarray(0, maxBytes));
}

/**
 * Decode both streams under ONE shared byte budget.
 *
 * The kill fires on the *combined* size, so decoding each stream against the
 * full budget independently let a single response carry twice it — and the api
 * gateway then cached that body into a Redis it shares with the rate limiter's
 * counters. `maxBytes` is therefore the true worst case for stdout + stderr,
 * which is what `meta.outputLimitBytes` reports.
 *
 * The budget is split fairly rather than first-come: each stream is guaranteed
 * half if it wants it, and whatever the smaller stream leaves unused goes back
 * to the other. Handing stdout the whole budget first would let a runaway print
 * loop starve the one stderr line that explains why it ran away.
 */
function decodeBoth(
  stdoutChunks: Buffer[],
  stderrChunks: Buffer[],
  maxBytes: number,
): { stdout: string; stderr: string } {
  const out = Buffer.concat(stdoutChunks);
  const err = Buffer.concat(stderrChunks);
  const half = Math.floor(maxBytes / 2);
  const errShare = Math.min(err.length, maxBytes - Math.min(out.length, half));
  const outShare = Math.min(out.length, maxBytes - errShare);
  return { stdout: decodeCapped(out, outShare), stderr: decodeCapped(err, errShare) };
}

export async function runCommand(
  cmd: string,
  args: string[],
  opts: {
    timeoutMs: number;
    maxOutputBytes: number;
    spawnOptions?: Pick<SpawnOptions, "cwd" | "env">;
    input?: string;
  },
): Promise<RunResult> {
  const stdin = opts.input !== undefined ? "pipe" : "ignore";
  const child = spawn(cmd, args, { stdio: [stdin, "pipe", "pipe"], ...opts.spawnOptions });

  // Chunks are kept as raw Buffers and decoded once at the end: decoding each
  // chunk on arrival splits multi-byte UTF-8 characters across chunk
  // boundaries (mojibake in any non-ASCII output), and re-measuring the joined
  // string per chunk made the byte accounting quadratic in the output size.
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  let totalBytes = 0;
  let outputTruncated = false;
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, opts.timeoutMs);

  const collect = (chunks: Buffer[]) => (chunk: Buffer) => {
    chunks.push(chunk);
    totalBytes += chunk.length;
    if (totalBytes > opts.maxOutputBytes) {
      outputTruncated = true;
      child.kill("SIGKILL");
    }
  };

  child.stdout?.on("data", collect(stdoutChunks));
  child.stderr?.on("data", collect(stderrChunks));

  if (opts.input !== undefined && child.stdin) {
    // If the child exits before draining stdin, Node emits 'error' (EPIPE) on
    // the write stream; with no listener that's an uncaught exception, and
    // this process is a pod running someone else's binary that has every
    // reason to exit early. The run's outcome is already decided by the
    // child's own close/error handlers below, so this only needs to stop the
    // write from crashing the process — not change the result.
    child.stdin.on("error", () => {});
    child.stdin.write(opts.input);
    child.stdin.end();
  }

  return await new Promise<RunResult>((resolve) => {
    // `settled` guards against a close+error double-resolve race.
    let settled = false;
    const done = (r: RunResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };
    child.on("close", (code) => {
      clearTimeout(timer);
      done({
        ...decodeBoth(stdoutChunks, stderrChunks, opts.maxOutputBytes),
        exitCode: code,
        timedOut,
        outputTruncated,
      });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      done({
        stdout: "",
        stderr: String(err),
        exitCode: -1,
        timedOut,
        outputTruncated,
        spawnError: true,
      });
    });
  });
}
