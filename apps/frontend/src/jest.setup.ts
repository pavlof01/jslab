import {
  CompressionStream,
  DecompressionStream,
  ReadableStream,
  TransformStream,
  WritableStream,
} from "node:stream/web";
import { TextDecoder, TextEncoder } from "node:util";
import { deserialize, serialize } from "node:v8";

type Fillable = Record<string, unknown>;
const g = globalThis as unknown as Fillable;

function fill(name: string, value: unknown) {
  if (g[name] === undefined) g[name] = value;
}

// Used by the embed snapshot codec and anything doing byte-level work.
fill("TextEncoder", TextEncoder);
fill("TextDecoder", TextDecoder);
fill("structuredClone", <T>(value: T): T => deserialize(serialize(value)) as T);
fill(
  "matchMedia",
  (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
);

// Streams: jsdom has no CompressionStream at all, which is what the snapshot
// codec compresses with.
fill("ReadableStream", ReadableStream);
fill("WritableStream", WritableStream);
fill("TransformStream", TransformStream);
fill("CompressionStream", CompressionStream);
fill("DecompressionStream", DecompressionStream);

fill(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
