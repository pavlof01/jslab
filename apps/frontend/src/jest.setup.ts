/**
 * jsdom omits several platform APIs that the browser has and our code uses.
 * Node has all of them, so fill in only what is actually missing — never
 * overwrite something jsdom does provide, or tests stop exercising the
 * implementation the browser would run.
 */
import { TextDecoder, TextEncoder } from "node:util";
import { CompressionStream, DecompressionStream, ReadableStream, TransformStream, WritableStream } from "node:stream/web";

type Fillable = Record<string, unknown>;
const g = globalThis as unknown as Fillable;

function fill(name: string, value: unknown) {
  if (g[name] === undefined) g[name] = value;
}

// Used by the embed snapshot codec and anything doing byte-level work.
fill("TextEncoder", TextEncoder);
fill("TextDecoder", TextDecoder);

// Streams: jsdom has no CompressionStream at all, which is what the snapshot
// codec compresses with.
fill("ReadableStream", ReadableStream);
fill("WritableStream", WritableStream);
fill("TransformStream", TransformStream);
fill("CompressionStream", CompressionStream);
fill("DecompressionStream", DecompressionStream);
