"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { ActionBar, Box, Button, Flex, HStack, Portal, Show, Spacer, Text } from "@chakra-ui/react";
import { HeaderBar } from "../components/HeaderBar";
import { EditorPanel } from "../components/EditorPanel";
import { OutputsPanel } from "../components/OutputsPanel";
import { ENGINE_KEYS, EngineKey, isEngineKey } from "../lib/types";
import type { ApiResponse, EngineResult, RunStatus, VersionsResp } from "../lib/types";
import { useColorModeValue } from "@/components/ui/color-mode";
import EngineCheckboxSelector from "@/components/EngineCheckboxSelector";
import { CiPlay1 } from "react-icons/ci";
import { LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import Samples, { samples } from "@/components/Samples";

const MIN_SPLIT = 0;
const START_SPLIT = 0.35;
const MAX_SPLIT = 0.9;

const tabs: { key: EngineKey; label: string }[] = [
  { key: EngineKey.v8, label: "V8" },
  { key: EngineKey.sm, label: "SpiderMonkey" },
  { key: EngineKey.hermes, label: "Hermes" },
  { key: EngineKey.jsc, label: "JSC" },
];

const v8NativeIntrinsics = [
  {
    name: "%OptimizeFunctionOnNextCall",
    insertText: "%OptimizeFunctionOnNextCall(${1:function});",
    detail: "V8 native · Optimise function on its next invocation",
  },
  {
    name: "%PrepareFunctionForOptimization",
    insertText: "%PrepareFunctionForOptimization(${1:function});",
    detail: "V8 native · Marks function so optimisation can be triggered",
  },
  {
    name: "%GetOptimizationStatus",
    insertText: "%GetOptimizationStatus(${1:function});",
    detail: "V8 native · Returns optimisation state bits",
  },
  {
    name: "%DebugPrint",
    insertText: "%DebugPrint(${1:value});",
    detail: "V8 native · Prints internal representation of value",
  },
  {
    name: "%DebugTrace",
    insertText: "%DebugTrace();",
    detail: "V8 native · Enables tracing for following execution",
  },
  {
    name: "%DisassembleFunction",
    insertText: "%DisassembleFunction(${1:function});",
    detail: "V8 native · Dumps generated code for the function",
  },
  {
    name: "%CollectGarbage",
    insertText: "%CollectGarbage(${1:space});",
    detail: "V8 native · Runs garbage collector for provided space",
  },
];

const DEFAULT_ENGINE_OUT: EngineResult = { exitCode: null, stdout: "", stderr: "" };
const createEmptyOut = (): Record<EngineKey, EngineResult> =>
  Object.fromEntries(ENGINE_KEYS.map((key) => [key, { ...DEFAULT_ENGINE_OUT }])) as Record<EngineKey, EngineResult>;
const createEngineSelection = (): Record<EngineKey, boolean> => ({
  [EngineKey.v8]: true,
  [EngineKey.sm]: false,
  [EngineKey.hermes]: false,
  [EngineKey.jsc]: false,
});
const createEmptyVersions = (): Record<EngineKey, string> =>
  Object.fromEntries(ENGINE_KEYS.map((key) => [key, ""])) as Record<EngineKey, string>;

type PreviousRunSnapshot = {
  out: Record<EngineKey, EngineResult>;
  engines: EngineKey[];
  activeTab: EngineKey;
  code: string;
  v8Flags: string[];
  timestamp: number;
};
type RunContext = Omit<PreviousRunSnapshot, "out">;

export default function Page() {
  const [code, setCode] = useState(samples.add);
  const [engines, setEngines] = useState<Record<EngineKey, boolean>>(() => createEngineSelection());
  const [status, setStatus] = useState<RunStatus>("idle");

  const [out, setOut] = useState<Record<EngineKey, EngineResult>>(() => createEmptyOut());

  const [previousSnapshot, setPreviousSnapshot] = useState<PreviousRunSnapshot>();
  const [currentRunContext, setCurrentRunContext] = useState<RunContext>();
  const [meta, setMeta] = useState<string>("");
  const [activeTab, setActiveTab] = useState<EngineKey>(EngineKey.v8);
  const [versions, setVersions] = useState<Record<EngineKey, string>>(() => createEmptyVersions());
  const [panelSplit, setPanelSplit] = useState(START_SPLIT);
  const [selectedV8Flags, setSelectedV8Flags] = useState<string[]>(["--print-bytecode"]);
  const [showPreviousPanel, setShowPreviousPanel] = useState(false);
  const [previousPanelTab, setPreviousPanelTab] = useState<EngineKey>(EngineKey.v8);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const completionRef = useRef<any>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const pageBg = useColorModeValue("#f8fafc", "#0f172a");
  const panelBg = useColorModeValue("#ffffff", "#1e293b");
  const borderColor = useColorModeValue("#e2e8f0", "#334155");
  const splitterBg = useColorModeValue("#e2e8f0", "#475569");
  const splitterGripBg = useColorModeValue("#94a3b8", "#94a3b8");
  const textPrimary = useColorModeValue("#0f172a", "#e2e8f0");

  const selectedEngines = useMemo(() => ENGINE_KEYS.filter((key) => engines[key]), [engines]);

  const previousTabs = useMemo(
    () => (previousSnapshot ? tabs.filter((tab) => previousSnapshot.engines.includes(tab.key)) : []),
    [previousSnapshot]
  );

  const previousActiveTabIndex = useMemo(() => {
    if (!previousTabs.length) return 0;
    const idx = previousTabs.findIndex((tab) => tab.key === previousPanelTab);
    return idx >= 0 ? idx : 0;
  }, [previousPanelTab, previousTabs]);

  const handleEnginesChange = useCallback((values: EngineKey[]) => {
    setEngines(() => {
      const normalized = new Set<EngineKey>([EngineKey.v8]);
      values.forEach((value) => {
        if (isEngineKey(value)) {
          normalized.add(value);
        }
      });
      const next = createEngineSelection();
      ENGINE_KEYS.forEach((engine) => {
        next[engine] = normalized.has(engine);
      });
      return next;
    });
  }, []);

  const enabledTabs = useMemo(() => tabs.filter((tab) => engines[tab.key]), [engines]);
  const activeTabIndex = useMemo(() => {
    const idx = enabledTabs.findIndex((tab) => tab.key === activeTab);
    return idx >= 0 ? idx : 0;
  }, [enabledTabs, activeTab]);

  useEffect(() => {
    if (enabledTabs.length === 0) return;
    if (!enabledTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(enabledTabs[0].key);
    }
  }, [enabledTabs, activeTab]);

  useEffect(() => {
    if (!previousSnapshot) return;
    const available = tabs.filter((tab) => previousSnapshot.engines.includes(tab.key));
    if (available.length === 0) return;
    const preferred = available.find((tab) => tab.key === previousSnapshot.activeTab) ?? available[0];
    setPreviousPanelTab(preferred.key);
  }, [previousSnapshot]);

  useEffect(() => {
    setCurrentRunContext((prev) => {
      if (!prev || prev.activeTab === activeTab) return prev;
      return { ...prev, activeTab };
    });
  }, [activeTab]);

  const hasPreviousSnapshot = previousSnapshot !== null && previousTabs.length > 0;

  useEffect(() => {
    if (!hasPreviousSnapshot) {
      setShowPreviousPanel(false);
    }
  }, [hasPreviousSnapshot]);

  const editorCollapsed = panelSplit <= MIN_SPLIT;

  const onMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [1109],
    });
    completionRef.current?.dispose?.();
    completionRef.current = monaco.languages.registerCompletionItemProvider("javascript", {
      triggerCharacters: ["%"],
      provideCompletionItems(model: any, position: any) {
        const word = model.getWordUntilPosition(position);
        const beforeWordRange = new monaco.Range(
          position.lineNumber,
          Math.max(1, word.startColumn - 1),
          position.lineNumber,
          word.startColumn
        );
        const beforeWord = model.getValueInRange(beforeWordRange);
        const startColumn = beforeWord === "%" ? Math.max(1, word.startColumn - 1) : word.startColumn;
        const range = new monaco.Range(position.lineNumber, startColumn, position.lineNumber, word.endColumn);

        const suggestions = v8NativeIntrinsics.map((intrinsic) => ({
          label: intrinsic.name,
          kind: monaco.languages.CompletionItemKind.Function,
          detail: intrinsic.detail,
          documentation: "Requires --allow-natives-syntax when running d8.",
          insertText: intrinsic.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }));

        return { suggestions };
      },
    });
  }, []);

  useEffect(() => () => completionRef.current?.dispose?.(), []);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches("%[A-Za-z_][A-Za-z0-9_]*", false, true, false, null, true);
    const decorations = matches.map((match: { range: any }) => ({
      range: match.range,
      options: { inlineClassName: "token-native-intrinsic" },
    }));
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  }, [code]);

  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
      }
    };
  }, []);

  const handleEditorChange = useCallback((value?: string) => {
    const next = value ?? "";
    setCode(next);
  }, []);

  const clampSplit = useCallback((value: number) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value)), []);

  const adjustSplit = useCallback(
    (delta: number) => {
      setPanelSplit((prev) => clampSplit(prev + delta));
    },
    [clampSplit]
  );

  const handleSplitterPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const grid = gridRef.current;
      if (!grid) return;

      resizeCleanupRef.current?.();

      const handleMove = (pointerEvent: PointerEvent) => {
        const rect = grid.getBoundingClientRect();
        if (rect.width <= 0) return;
        const ratio = (pointerEvent.clientX - rect.left) / rect.width;
        if (!Number.isFinite(ratio)) return;
        setPanelSplit((prev) => {
          const next = clampSplit(ratio);
          return Math.abs(prev - next) < 0.0001 ? prev : next;
        });
      };

      const handleUp = () => {
        resizeCleanupRef.current?.();
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        document.body.classList.remove("resizing-cursor");
        resizeCleanupRef.current = null;
      };

      resizeCleanupRef.current = cleanup;

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp, { once: true });
      window.addEventListener("pointercancel", handleUp, { once: true });
      document.body.classList.add("resizing-cursor");
    },
    [clampSplit]
  );

  const handleSplitterKey = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        adjustSplit(-0.03);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        adjustSplit(0.03);
      } else if (event.key === "Home") {
        event.preventDefault();
        setPanelSplit((prev) => (prev === MIN_SPLIT ? prev : MIN_SPLIT));
      } else if (event.key === "End") {
        event.preventDefault();
        setPanelSplit((prev) => (prev === MAX_SPLIT ? prev : MAX_SPLIT));
      }
    },
    [adjustSplit]
  );

  const handleSplitterDoubleClick = useCallback(() => {
    setPanelSplit((prev) => (Math.abs(prev - 0.5) < 0.0001 ? prev : 0.5));
  }, []);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/versions", { cache: "no-store" });
        const data: VersionsResp = await response.json();
        const collected = createEmptyVersions();
        ENGINE_KEYS.forEach((key) => {
          const info = data?.engines?.[key];
          collected[key] = info?.ok ? info.short || "ok" : "unavailable";
        });
        setVersions(collected);
      } catch {
        const fallback = Object.fromEntries(ENGINE_KEYS.map((key) => [key, "n/a"])) as Record<EngineKey, string>;
        setVersions(fallback);
      }
    })();
  }, []);

  const run = useCallback(async () => {
    if (currentRunContext) {
      const snapshotOut = Object.fromEntries(
        (Object.entries(out) as [EngineKey, EngineResult][]).map(([key, value]) => [key, { ...value }])
      ) as Record<EngineKey, EngineResult>;
      setPreviousSnapshot({
        out: snapshotOut,
        engines: [...currentRunContext.engines],
        activeTab: currentRunContext.activeTab,
        code: currentRunContext.code,
        v8Flags: [...currentRunContext.v8Flags],
        timestamp: currentRunContext.timestamp,
      });
    }

    const enginesForRun = [...selectedEngines];
    const flagsForRun = [...selectedV8Flags];
    const codeForRun = code;
    const startActiveTab = activeTab;
    const runTimestamp = Date.now();

    setStatus("running");
    setOut(createEmptyOut());
    setMeta("");

    try {
      const response = await fetch("/api/bytecode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: codeForRun, engines: enginesForRun, v8Flags: flagsForRun }),
      });
      const data: ApiResponse = await response.json();
      if (!data.ok) throw new Error(data.error || "Request failed");

      const results = data.results ?? {};
      const nextOut = createEmptyOut();
      ENGINE_KEYS.forEach((engine) => {
        const engineResult = results[engine];
        nextOut[engine] = {
          exitCode: engineResult?.exitCode ?? null,
          stdout: (engineResult?.stdout ?? "").trim(),
          stderr: (engineResult?.stderr ?? "").trim(),
          ms: engineResult?.ms,
        };
      });
      setOut(nextOut);
      if (data.meta) setMeta(`Duration: ${data.meta.ms} ms`);
      setCurrentRunContext({
        engines: enginesForRun,
        activeTab: startActiveTab,
        code: codeForRun,
        v8Flags: flagsForRun,
        timestamp: runTimestamp,
      });
      setStatus("done");
    } catch (error: any) {
      setStatus("error");
      setMeta(error?.message || "Error");
    }
  }, [activeTab, code, currentRunContext, out, selectedEngines, selectedV8Flags]);

  const handleSampleSelect = useCallback((snippet: string) => {
    setCode(snippet);
    requestAnimationFrame(() => {
      editorRef.current?.focus?.();
    });
  }, []);

  return (
    <Flex direction="column" minH="100vh" bg={pageBg} color={textPrimary}>
      <Box as="header" px={6} py={4} borderBottom="1px solid" borderColor={borderColor} bg={panelBg}>
        <HeaderBar onRun={run} status={status} meta={meta} versions={versions} />
      </Box>

      <Flex ref={gridRef} gap={4} flex="1" px={6} py={4} align="stretch">
        <Show when={!editorCollapsed}>
          <Box
            bg={panelBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="lg"
            display="flex"
            flexDirection="column"
            overflow="hidden"
            minH={0}
            flexGrow={panelSplit}
            flexShrink={1}
            flexBasis="0%"
          >
            <HStack px={5} py={2} borderBottom="1px solid" justifyContent="space-between" borderColor={borderColor}>
              <Box>
                <Text fontWeight="semibold">Editor</Text>
              </Box>
              <Samples currentCode={code} onSelectSample={handleSampleSelect} />
              <Button
                size="xl"
                w={120}
                bgColor="green.300"
                onClick={run}
                loading={status === "running"}
                loadingText="Running"
              >
                <CiPlay1 /> Run
              </Button>
            </HStack>
            <EditorPanel code={code} onCodeChange={handleEditorChange} onEditorMount={onMount} />
          </Box>
        </Show>

        <Show when={!editorCollapsed}>
          <Box
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={Math.round(panelSplit * 100)}
            aria-valuemin={MIN_SPLIT * 100}
            aria-valuemax={MAX_SPLIT * 100}
            tabIndex={0}
            onPointerDown={handleSplitterPointerDown}
            onDoubleClick={handleSplitterDoubleClick}
            onKeyDown={handleSplitterKey}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg={splitterBg}
            borderRadius="full"
            cursor="col-resize"
            minH="160px"
            flex="0 0 12px"
            w="12px"
          >
            <Box w="4px" h="32px" borderRadius="full" bg={splitterGripBg} />
          </Box>
        </Show>

        <Box
          bg={panelBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="lg"
          display="flex"
          flexDirection="column"
          overflow="hidden"
          minH={0}
          flexGrow={Math.max(0.1, 1 - panelSplit)}
          flexShrink={1}
          flexBasis="0%"
          position="relative"
        >
          <ActionBar.Root open={editorCollapsed}>
            <Portal>
              <ActionBar.Positioner bottom="32px" left="32px">
                <ActionBar.Content shadow="lg" borderRadius="lg">
                  <ActionBar.SelectionTrigger display="flex" alignItems="center" gap={2}>
                    <LuPanelLeftClose />
                    Editor Hidden
                  </ActionBar.SelectionTrigger>
                  <ActionBar.Separator />
                  <Button size="sm" colorScheme="blue" onClick={() => setPanelSplit(START_SPLIT)}>
                    Show Editor <LuPanelLeftOpen />
                  </Button>
                </ActionBar.Content>
              </ActionBar.Positioner>
            </Portal>
          </ActionBar.Root>

          <HStack px={4} py={4} borderBottom="1px solid" borderColor={borderColor}>
            <Text fontWeight="semibold">Outputs</Text>
            <Spacer />
            <Button
              size="sm"
              variant={showPreviousPanel ? "solid" : "outline"}
              colorScheme={showPreviousPanel ? "blue" : undefined}
              onClick={() => {
                setShowPreviousPanel((prev) => {
                  return !prev;
                });
              }}
              disabled={!hasPreviousSnapshot}
            >
              {showPreviousPanel ? "Hide Previous Output" : "Show Previous Output"}
            </Button>
            <EngineCheckboxSelector
              selectedEngines={selectedEngines}
              onEnginesChange={handleEnginesChange}
              tabs={tabs}
            />
          </HStack>
          <Flex flex="1" minH="0" gap={4} px={4} py={4} overflow="hidden">
            <Box flex="1" minH="0" display="flex">
              <OutputsPanel
                title="Current"
                enabledTabs={enabledTabs}
                activeTabIndex={activeTabIndex}
                activeTab={activeTab}
                onTabChange={(key) => setActiveTab(key)}
                out={out}
                versions={versions}
                selectedV8Flags={selectedV8Flags}
                setSelectedV8Flags={setSelectedV8Flags}
                showFlagControls={!showPreviousPanel}
              />
            </Box>
            <Show when={showPreviousPanel && hasPreviousSnapshot && previousSnapshot}>
              <Box flex="1" minH="0" display="flex" borderLeft="1px solid" borderColor={borderColor} pl={4}>
                <Box flex="1" minH="0" display="flex">
                  <OutputsPanel
                    title="Previous"
                    enabledTabs={previousTabs}
                    activeTabIndex={previousActiveTabIndex}
                    activeTab={previousPanelTab}
                    onTabChange={(key) => setPreviousPanelTab(key)}
                    out={previousSnapshot?.out}
                    versions={versions}
                    selectedV8Flags={previousSnapshot?.v8Flags}
                    showFlagControls={false}
                  />
                </Box>
              </Box>
            </Show>
          </Flex>
        </Box>
      </Flex>
    </Flex>
  );
}
