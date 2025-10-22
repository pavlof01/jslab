"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { Box, Button, Flex, HStack, Text } from "@chakra-ui/react";
import { Global } from "@emotion/react";
import { HeaderBar } from "../components/HeaderBar";
import { EditorPanel } from "../components/EditorPanel";
import { OutputsPanel } from "../components/OutputsPanel";
import type { ApiResponse, EngineKey, EngineResult, RunStatus, VersionsResp } from "../lib/types";
import { useColorModeValue } from "@/components/ui/color-mode";
import EngineCheckboxSelector from "@/components/EngineCheckboxSelector";
import { CiPlay1 } from "react-icons/ci";
import Samples, { samples } from "@/components/Samples";

const MIN_SPLIT = 0.1;
const START_SPLIT = 0.35;
const MAX_SPLIT = 0.9;

const tabs: { key: EngineKey; label: string }[] = [
  { key: "v8", label: "V8" },
  { key: "sm", label: "SpiderMonkey" },
  { key: "hermes", label: "Hermes" },
  { key: "jsc", label: "JSC" },
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

export default function Page() {
  const [code, setCode] = useState(samples.add);
  const [engines, setEngines] = useState<Record<EngineKey, boolean>>({
    v8: true,
    sm: false,
    hermes: false,
    jsc: false,
  });
  const [status, setStatus] = useState<RunStatus>("idle");
  const [out, setOut] = useState<Record<EngineKey, EngineResult>>({
    v8: { exitCode: null, stdout: "", stderr: "" },
    sm: { exitCode: null, stdout: "", stderr: "" },
    hermes: { exitCode: null, stdout: "", stderr: "" },
    jsc: { exitCode: null, stdout: "", stderr: "" },
  });
  const [meta, setMeta] = useState<string>("");
  const [activeTab, setActiveTab] = useState<EngineKey>("v8");
  const [versions, setVersions] = useState<Record<EngineKey, string>>({ v8: "", sm: "", hermes: "", jsc: "" });
  const [panelSplit, setPanelSplit] = useState(START_SPLIT);
  const [selectedV8Flags, setSelectedV8Flags] = useState<string[]>(["--print-bytecode"]);

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

  const selectedEngines = useMemo(() => (Object.keys(engines) as EngineKey[]).filter((key) => engines[key]), [engines]);

  const handleEnginesChange = useCallback((values: string[]) => {
    setEngines(() => {
      const base: Record<EngineKey, boolean> = { v8: true, sm: false, hermes: false, jsc: false };
      const normalized = new Set<EngineKey>(["v8"]);
      values.forEach((value) => {
        if ((["v8", "sm", "hermes", "jsc"] as EngineKey[]).includes(value as EngineKey)) {
          normalized.add(value as EngineKey);
        }
      });
      normalized.forEach((engine) => {
        base[engine] = true;
      });
      return base;
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
        setPanelSplit(clampSplit(ratio));
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
        setPanelSplit(MIN_SPLIT);
      } else if (event.key === "End") {
        event.preventDefault();
        setPanelSplit(MAX_SPLIT);
      }
    },
    [adjustSplit]
  );

  const handleSplitterDoubleClick = useCallback(() => {
    setPanelSplit(0.5);
  }, []);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/versions", { cache: "no-store" });
        const data: VersionsResp = await response.json();
        const collected: Record<EngineKey, string> = { v8: "", sm: "", hermes: "", jsc: "" };
        (Object.keys(collected) as EngineKey[]).forEach((key) => {
          const info = data?.engines?.[key];
          collected[key] = info?.ok ? info.short || "ok" : "unavailable";
        });
        setVersions(collected);
      } catch {
        setVersions({ v8: "n/a", sm: "n/a", hermes: "n/a", jsc: "n/a" });
      }
    })();
  }, []);

  const run = useCallback(async () => {
    setStatus("running");
    setOut({
      v8: { exitCode: null, stdout: "", stderr: "" },
      sm: { exitCode: null, stdout: "", stderr: "" },
      hermes: { exitCode: null, stdout: "", stderr: "" },
      jsc: { exitCode: null, stdout: "", stderr: "" },
    });
    setMeta("");

    try {
      const response = await fetch("/api/bytecode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, engines: selectedEngines, v8Flags: selectedV8Flags }),
      });
      const data: ApiResponse = await response.json();
      if (!data.ok) throw new Error(data.error || "Request failed");

      const results = data.results || {};
      setOut({
        v8: {
          exitCode: results.v8?.exitCode ?? null,
          stdout: (results.v8?.stdout ?? "").trim(),
          stderr: (results.v8?.stderr ?? "").trim(),
          ms: results.v8?.ms,
        },
        sm: {
          exitCode: results.sm?.exitCode ?? null,
          stdout: (results.sm?.stdout ?? "").trim(),
          stderr: (results.sm?.stderr ?? "").trim(),
          ms: results.sm?.ms,
        },
        hermes: {
          exitCode: results.hermes?.exitCode ?? null,
          stdout: (results.hermes?.stdout ?? "").trim(),
          stderr: (results.hermes?.stderr ?? "").trim(),
          ms: results.hermes?.ms,
        },
        jsc: {
          exitCode: results.jsc?.exitCode ?? null,
          stdout: (results.jsc?.stdout ?? "").trim(),
          stderr: (results.jsc?.stderr ?? "").trim(),
          ms: results.jsc?.ms,
        },
      });
      if (data.meta) setMeta(`Duration: ${data.meta.ms} ms`);
      setStatus("done");
    } catch (error: any) {
      setStatus("error");
      setMeta(error?.message || "Error");
    }
  }, [code, selectedEngines, selectedV8Flags]);

  const handleSampleSelect = useCallback((snippet: string) => {
    setCode(snippet);
    requestAnimationFrame(() => {
      editorRef.current?.focus?.();
    });
  }, []);

  return (
    <>
      <Global
        styles={`
          .token-native-intrinsic { color: #f59e0b; font-weight: 600; }
          body.resizing-cursor, body.resizing-cursor * { cursor: col-resize !important; }
        `}
      />
      <Flex direction="column" minH="100vh" bg={pageBg} color={textPrimary}>
        <Box as="header" px={6} py={4} borderBottom="1px solid" borderColor={borderColor} bg={panelBg}>
          <HeaderBar onRun={run} status={status} meta={meta} versions={versions} />
        </Box>

        <Flex ref={gridRef} gap={4} flex="1" px={6} py={4} align="stretch">
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
          >
            <HStack px={4} py={4} borderBottom="1px solid" borderColor={borderColor}>
              <Text fontWeight="semibold">Outputs</Text>
              <EngineCheckboxSelector
                selectedEngines={selectedEngines}
                onEnginesChange={handleEnginesChange}
                tabs={tabs}
              />
            </HStack>
            <OutputsPanel
              enabledTabs={enabledTabs}
              activeTabIndex={activeTabIndex}
              activeTab={activeTab}
              onTabChange={(key) => setActiveTab(key)}
              out={out}
              versions={versions}
              selectedV8Flags={selectedV8Flags}
              setSelectedV8Flags={setSelectedV8Flags}
            />
          </Box>
        </Flex>
      </Flex>
    </>
  );
}
