"use client";

import { useMemo } from "react";

import EcmaSpecPanel from "@/app/abstract-functions-visualizer/components/EcmaSpecPanel";
import SpecTraceScreen, {
  type SpecTracePreset,
} from "@/app/abstract-functions-visualizer/components/SpecTraceScreen";
import type { VisualizerInitialData } from "@/app/abstract-functions-visualizer/model";
import { useVisualizerRuntime } from "@/app/abstract-functions-visualizer/useVisualizerRuntime";

import AlgoPicker from "./AlgoPicker";
import { PRESETS } from "./presets";

type Props = { initialData: VisualizerInitialData; hint: React.ReactNode };

const VisualizerScreen: React.FC<Props> = ({ initialData, hint }) => {
  const {
    root,
    resultValue,
    error,
    isTracing,
    flatEntries,
    specHtml,
    effectiveAlgoId,
    category,
    selectedAlgo,
    traceInputRaw,
    traceInputExpression,
    functionOptions,
    selectedIndex,
    isPlaying,
    onSelectIndex,
    togglePlay,
    pickExpression,
    setSelectedAlgo,
    setTraceInputRaw,
    commitTraceInput,
  } = useVisualizerRuntime(initialData);

  const presets: SpecTracePreset[] = useMemo(
    () =>
      PRESETS[category].map((label) => ({
        label,
        active: label === traceInputExpression,
        onPick: () => pickExpression(label),
      })),
    [category, traceInputExpression, pickExpression],
  );

  const algoPicker = useMemo(
    () =>
      category === "typeConversion" ? (
        <AlgoPicker value={selectedAlgo} options={functionOptions} onChange={setSelectedAlgo} />
      ) : undefined,
    [category, functionOptions, selectedAlgo, setSelectedAlgo],
  );

  return (
    <SpecTraceScreen
      root={root}
      resultValue={resultValue}
      error={error}
      tracing={isTracing}
      selectedIndex={selectedIndex}
      stepCount={flatEntries.length}
      isPlaying={isPlaying}
      onSelectIndex={onSelectIndex}
      onTogglePlay={togglePlay}
      specId={effectiveAlgoId ?? selectedAlgo}
      expression={traceInputRaw}
      onExpressionChange={setTraceInputRaw}
      onTrace={commitTraceInput}
      hint={hint}
      presets={presets}
      extraControl={algoPicker}
      specPane={
        <EcmaSpecPanel
          flatEntries={flatEntries}
          selectedIndex={selectedIndex}
          specHtml={specHtml}
        />
      }
    />
  );
};

export default VisualizerScreen;
