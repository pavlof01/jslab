"use client";

import { Box, createListCollection, Portal, Select } from "@chakra-ui/react";
import { useMemo } from "react";

import EcmaSpecPanel from "@/app/abstract-functions-visualizer/components/EcmaSpecPanel";
import SpecTraceScreen, {
  type SpecTracePreset,
} from "@/app/abstract-functions-visualizer/components/SpecTraceScreen";
import type {
  AlgoCategory,
  VisualizerInitialData,
} from "@/app/abstract-functions-visualizer/model";
import { fallbackInitialData } from "@/app/abstract-functions-visualizer/model";
import VisualizerStoreProvider from "@/app/abstract-functions-visualizer/StoreProvider";
import { useVisualizerRuntime } from "@/app/abstract-functions-visualizer/useVisualizerRuntime";

import { HINTS, PRESETS } from "./categoryContent";

type AlgoPickerProps = {
  value: string;
  options: string[];
  onChange: (next: string) => void;
};

const AlgoPicker: React.FC<AlgoPickerProps> = ({ value, options, onChange }) => {
  const collection = useMemo(() => createListCollection({ items: options }), [options]);

  return (
    <Select.Root
      collection={collection}
      size="sm"
      width="auto"
      value={[value]}
      onValueChange={(event) => onChange(event.value[0])}
      positioning={{ sameWidth: false }}
    >
      <Select.Control>
        <Select.Trigger aria-label="Abstract operation to trace">
          <Select.ValueText />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content maxH="min(60dvh, 420px)">
            {collection.items.map((item) => (
              <Select.Item item={item} key={item}>
                <Select.ItemText>{item}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};

type AbstractFunctionsVisualizerProps = {
  initialCategory?: AlgoCategory;
  initialData?: VisualizerInitialData;
};

const AbstractFunctionsVisualizer: React.FC<AbstractFunctionsVisualizerProps> = ({
  initialCategory = "typeConversion",
  initialData,
}) => {
  const resolved = initialData ?? fallbackInitialData(initialCategory);

  return (
    <VisualizerStoreProvider initialData={resolved}>
      <VisualizerScreen initialData={resolved} />
    </VisualizerStoreProvider>
  );
};

type VisualizerScreenProps = { initialData: VisualizerInitialData };

const VisualizerScreen: React.FC<VisualizerScreenProps> = ({ initialData }) => {
  const {
    root,
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
    <Box as="main" bg="surface.base" minH="calc(100dvh - {sizes.header})">
      <SpecTraceScreen
        root={root}
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
        hint={HINTS[category]}
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
    </Box>
  );
};

export default AbstractFunctionsVisualizer;
