"use client";

import { useCallback } from "react";

import Samples from "@/components/Samples";
import { EngineKey } from "@/lib/types";
import { useCode, useEngineFlags, useSetCode } from "@/store/engineOutputsSelectors";

const PlaygroundSamples: React.FC = () => {
  const code = useCode();
  const setCode = useSetCode();
  const { setEngineFlags } = useEngineFlags();

  const loadSample = useCallback(
    (sampleCode: string, v8Flags?: readonly string[]) => {
      setCode(sampleCode);
      if (v8Flags) setEngineFlags(EngineKey.v8, [...v8Flags]);
    },
    [setCode, setEngineFlags],
  );

  return <Samples currentCode={code} onSelectSample={loadSample} />;
};

export default PlaygroundSamples;
