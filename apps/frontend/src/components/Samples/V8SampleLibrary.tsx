"use client";

import { Code, Text } from "@chakra-ui/react";

import { type V8SampleKey, v8SampleCatalog, v8Samples } from "@/lib/samples";
import { V8_NATIVES_FLAG } from "@/lib/v8Intrinsics";

import { SampleCard } from "./SampleCard";
import { SampleGrid } from "./SampleLibrary";

export function V8SampleLibrary({
  loadedId,
  onLoad,
}: {
  loadedId: string | null;
  onLoad: (code: string, id: string) => void;
}) {
  return (
    <>
      <Text fontSize="sm" color="ink.2">
        Examples exploring V8 engine internals: element kinds, hidden classes, inline caches, and
        bytecode. Run with <Code>{V8_NATIVES_FLAG}</Code> or <Code>--print-bytecode</Code> as noted
        in each sample.
      </Text>
      <SampleGrid>
        {v8SampleCatalog.map(({ key, label, description }) => (
          <SampleCard
            key={key}
            id={`v8:${key}`}
            title={label}
            description={description}
            snippet={v8Samples[key as V8SampleKey]}
            active={loadedId === `v8:${key}`}
            onSelect={() => onLoad(v8Samples[key as V8SampleKey], `v8:${key}`)}
          />
        ))}
      </SampleGrid>
    </>
  );
}
