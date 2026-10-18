"use client";

import { Text } from "@chakra-ui/react";

import { v8SampleCatalog, type V8SampleKey, v8Samples } from "@/lib/samples";

import SampleCard from "./SampleCard";
import { SampleGrid } from "./SampleLibrary";

type Props = {
  loadedId: string | null;
  onLoad: (code: string, id: string, v8Flags: readonly string[]) => void;
};

const V8SampleLibrary: React.FC<Props> = ({ loadedId, onLoad }) => {
  return (
    <>
      <Text fontSize="sm" color="ink.2">
        Examples exploring V8 engine internals: element kinds, hidden classes, inline caches, and
        bytecode. Picking one switches on the V8 flags it needs.
      </Text>
      <SampleGrid>
        {v8SampleCatalog.map(({ key, label, description, flags }) => (
          <SampleCard
            key={key}
            id={`v8:${key}`}
            title={label}
            description={description}
            snippet={v8Samples[key as V8SampleKey]}
            active={loadedId === `v8:${key}`}
            onSelect={() => onLoad(v8Samples[key as V8SampleKey], `v8:${key}`, flags)}
          />
        ))}
      </SampleGrid>
    </>
  );
};

export default V8SampleLibrary;
