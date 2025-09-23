"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import Editor from "@monaco-editor/react";

type EngineKey = "v8" | "sm" | "hermes" | "jsc";
type EngineResult = { exitCode: number | null; stdout: string; stderr: string; ms?: number };
type ApiResponse = { ok: boolean; results?: Record<string, EngineResult>; meta?: { ms: number }; error?: string };
type VersionInfo = { ok: boolean; short?: string; raw?: string; exitCode?: number | null; error?: string };
type VersionsResp = { ok: boolean; engines: Record<EngineKey, VersionInfo> };

const MIN_SPLIT = 0.25;
const MAX_SPLIT = 0.75;

const logShim = [
  "const log = typeof globalThis.print === 'function'",
  "  ? globalThis.print",
  "  : (globalThis.console && typeof globalThis.console.log === 'function'",
  "      ? globalThis.console.log.bind(globalThis.console)",
  "      : function(){});",
].join("\n");

const samples: Record<string, string> = {
  add: `function f(x){ return x + 1 }\nf(41);`,
  closure: `function f(a){ function g(b){ return a + b } return g(1) }\nf(41);`,
  loop: `function f(n){ let s=0; for(let i=0;i<n;i++) s+=i; return s }\nf(10);`,
  try: `function f(){ try { throw 1 } catch(e){ return e + 1 } }\nf();`,
  d8Native: `${logShim}\nfunction hot(x){ return x + 1; }\nfor (let i = 0; i < 5000; i++) hot(i);\nif (typeof globalThis.d8 !== "undefined") {\n  eval('%OptimizeFunctionOnNextCall(hot);');\n}\nlog('hot(41)=', hot(41));`,
  typedarray: `${logShim}\nconst buffer = new ArrayBuffer(16);\nconst view = new DataView(buffer);\nview.setUint32(0, 0xdeadbeef, true);\nview.setFloat64(8, Math.PI, true);\nconst bytes = Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0'));\nlog('buffer bytes:', bytes.join(' '));\nlog('float64:', view.getFloat64(8, true).toFixed(6));`,
  asyncFlow: `${logShim}\nasync function loadUser(id){\n  return { id, name: 'user-' + id };\n}\nasync function main(){\n  const users = await Promise.all([1, 2, 3].map((id) => loadUser(id)));\n  const names = users.map((u) => u.name).join(', ');\n  log('async users:', names);\n}\nmain();`,
  generator: `${logShim}\nfunction* fibonacci(limit){\n  let a = 0, b = 1;\n  while (limit-- > 0) {\n    yield a;\n    [a, b] = [b, a + b];\n  }\n}\nlog('fib:', [...fibonacci(8)].join(', '));`,
};

type SampleKey = keyof typeof samples;

const sampleCatalog: { key: SampleKey; label: string; description: string }[] = [
  { key: "add", label: "Add", description: "Minimal function call returning 42." },
  { key: "closure", label: "Closure", description: "Capturing outer scope and invoking inner function." },
  { key: "loop", label: "Loop", description: "Simple for-loop summing integer range." },
  { key: "try", label: "Try/catch", description: "Exception handling flow returning a computed value." },
  { key: "d8Native", label: "d8 native", description: "Uses V8 % intrinsics to optimise a hot function." },
  { key: "typedarray", label: "Typed arrays", description: "Manipulates ArrayBuffer via DataView, prints bytes." },
  { key: "asyncFlow", label: "Async flow", description: "Async/await fetching mock users in parallel." },
  { key: "generator", label: "Generator", description: "Generates Fibonacci numbers via iterator." },
];

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
  const [engines, setEngines] = useState<Record<EngineKey, boolean>>({ v8: true, sm: true, hermes: true, jsc: true });
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [out, setOut] = useState<Record<EngineKey, EngineResult>>({
    v8: { exitCode: null, stdout: "", stderr: "" },
    sm: { exitCode: null, stdout: "", stderr: "" },
    hermes: { exitCode: null, stdout: "", stderr: "" },
    jsc: { exitCode: null, stdout: "", stderr: "" },
  });
  const [meta, setMeta] = useState<string>("");
  const [activeTab, setActiveTab] = useState<EngineKey>("v8");
  const [versions, setVersions] = useState<Record<EngineKey, string>>({ v8: "", sm: "", hermes: "", jsc: "" });
  const [onlyErr, setOnlyErr] = useState<boolean>(true);
  const [activeSample, setActiveSample] = useState<SampleKey | null>("add");
  const [panelSplit, setPanelSplit] = useState(0.55);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const completionRef = useRef<any>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const sampleApplyRef = useRef<SampleKey | null>("add");
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const activeSampleMeta = useMemo(
    () => sampleCatalog.find((item) => item.key === activeSample) || null,
    [activeSample]
  );
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
    const decorations = matches.map((m: { range: any }) => ({
      range: m.range,
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

  const handleEditorChange = useCallback(
    (value?: string) => {
      const next = value ?? "";
      setCode(next);
      if (sampleApplyRef.current) {
        sampleApplyRef.current = null;
      } else if (activeSample !== null) {
        setActiveSample(null);
      }
    },
    [activeSample]
  );

  const selectedEngines = useMemo(() => (Object.keys(engines) as EngineKey[]).filter((k) => engines[k]), [engines]);

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

      const handleMove = (e: PointerEvent) => {
        const rect = grid.getBoundingClientRect();
        if (rect.width <= 0) return;
        const ratio = (e.clientX - rect.left) / rect.width;
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

  // fetch versions once
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/versions", { cache: "no-store" });
        const data: VersionsResp = await r.json();
        const v: Record<EngineKey, string> = { v8: "", sm: "", hermes: "", jsc: "" };
        (["v8", "sm", "hermes", "jsc"] as EngineKey[]).forEach((k) => {
          const s = data?.engines?.[k];
          v[k] = s?.ok ? s.short || "ok" : "unavailable";
        });
        setVersions(v);
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
      const resp = await fetch("/api/bytecode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, engines: selectedEngines }),
      });
      const data: ApiResponse = await resp.json();
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
    } catch (e: any) {
      setStatus("error");
      setMeta(e?.message || "Error");
    }
  }, [code, selectedEngines]);

  const setSample = (key: SampleKey) => {
    sampleApplyRef.current = key;
    setActiveSample(key);
    setCode(samples[key]);
    setMeta(`Loaded sample: ${sampleCatalog.find((item) => item.key === key)?.label ?? key}`);
    requestAnimationFrame(() => {
      editorRef.current?.focus?.();
    });
  };

  const copyWithFallback = (text: string) => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.top = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  };

  const copyActive = async (stream: "stdout" | "stderr") => {
    const txt = out[activeTab]?.[stream] || "";
    if (!txt) {
      setMeta(`Nothing to copy from ${stream}`);
      return;
    }

    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (clipboard?.writeText) {
      try {
        await clipboard.writeText(txt);
        setMeta(`Copied ${stream} to clipboard`);
        return;
      } catch {
        /* fall back */
      }
    }

    const ok = copyWithFallback(txt);
    setMeta(ok ? `Copied ${stream} to clipboard` : `Copy ${stream} failed`);
  };

  const tabTitle = (label: string, ver?: string, ms?: number) =>
    `${ver ? `${label} · ${ver}` : label}${typeof ms === "number" ? ` · ${ms}ms` : ""}`;

  const downloadActive = (stream: "stdout" | "stderr") => {
    const nameMap = {
      v8: { stdout: "v8.bytecode.txt", stderr: "v8.stderr.txt" },
      sm: { stdout: "spidermonkey.bytecode.txt", stderr: "spidermonkey.stderr.txt" },
      hermes: { stdout: "hermes.dis.txt", stderr: "hermes.stderr.txt" },
      jsc: { stdout: "jsc.bytecode.txt", stderr: "jsc.stderr.txt" },
    } as const;
    const fileName = nameMap[activeTab][stream];
    const blob = new Blob([out[activeTab]?.[stream] || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const labelWithVersion = (label: string, ver?: string) => (ver ? `${label} · ${ver}` : label);

  const showOnlyErrFor = (k: EngineKey) => {
    if (!onlyErr) return false;
    const r = out[k];
    return !!(r.stderr && r.stderr.length > 0) || (typeof r.exitCode === "number" && r.exitCode !== 0);
  };

  return (
    <div className="page">
      <header className="bar">
        <div className="left">
          <div className="brand">
            <Image
              src="/logo.png"
              alt="JS Bytecode Explorer logo"
              width={40}
              height={40}
              className="brandLogo"
              priority
            />
            <span className="brandName">JS Bytecode Explorer</span>
          </div>
          <button className="btn primary" onClick={run} disabled={status === "running"}>
            Run
          </button>
          <label>
            <input
              type="checkbox"
              checked={engines.v8}
              onChange={(e) => setEngines((v) => ({ ...v, v8: e.target.checked }))}
            />{" "}
            V8
          </label>
          <label>
            <input
              type="checkbox"
              checked={engines.sm}
              onChange={(e) => setEngines((v) => ({ ...v, sm: e.target.checked }))}
            />{" "}
            SpiderMonkey
          </label>
          <label>
            <input
              type="checkbox"
              checked={engines.hermes}
              onChange={(e) => setEngines((v) => ({ ...v, hermes: e.target.checked }))}
            />{" "}
            Hermes
          </label>
          <label>
            <input
              type="checkbox"
              checked={engines.jsc}
              onChange={(e) => setEngines((v) => ({ ...v, jsc: e.target.checked }))}
            />{" "}
            JSC
          </label>
          <label title="Показывать только stderr, если у движка есть ошибки или ненулевой exit code">
            <input type="checkbox" checked={onlyErr} onChange={(e) => setOnlyErr(e.target.checked)} /> Only stderr on
            error
          </label>
        </div>
        <div className="right">
          <span className={`badge ${status}`}>{status}</span>
          {meta && <span className="meta">{meta}</span>}
          <div className="versions">
            <span className="chip" title={versions.v8}>
              {versions.v8 || "v8"}
            </span>
            <span className="chip" title={versions.sm}>
              {versions.sm || "sm"}
            </span>
            <span className="chip" title={versions.hermes}>
              {versions.hermes || "hermes"}
            </span>
            <span className="chip" title={versions.jsc}>
              {versions.jsc || "jsc"}
            </span>
          </div>
        </div>
      </header>

      <main
        className="grid"
        ref={gridRef}
        style={{ gridTemplateColumns: `${panelSplit}fr 10px ${Math.max(0.1, 1 - panelSplit)}fr` }}
      >
        <section className="panel">
          <div className="panelHead">
            <strong>Editor</strong>
            <div className="samplesWrap">
              <div className="samplesHeader">
                <span className="samplesTitle">Samples</span>
                {activeSampleMeta && <span className="samplesDescription">{activeSampleMeta.description}</span>}
              </div>
              <div className="sampleScroller" role="list">
                {sampleCatalog.map(({ key, label, description }) => (
                  <button
                    key={key}
                    type="button"
                    className={`btn sampleChip ${activeSample === key ? "active" : ""}`}
                    onClick={() => setSample(key)}
                    aria-pressed={activeSample === key}
                    title={description}
                    role="listitem"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="editorWrap">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={code}
              onChange={handleEditorChange}
              onMount={onMount}
              options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
          </div>
        </section>

        <div
          className="splitter"
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={Math.round(panelSplit * 100)}
          aria-valuemin={MIN_SPLIT * 100}
          aria-valuemax={MAX_SPLIT * 100}
          tabIndex={0}
          onPointerDown={handleSplitterPointerDown}
          onDoubleClick={handleSplitterDoubleClick}
          onKeyDown={handleSplitterKey}
        >
          <span className="splitterGrip" aria-hidden />
        </div>

        <section className="panel">
          <div className="panelHead">
            <div className="tabs">
              {tabs
                .filter((t) => engines[t.key]) // показываем только выбранные
                .map((t) => {
                  const hasOutput = (out[t.key]?.stdout?.length ?? 0) > 0 || (out[t.key]?.stderr?.length ?? 0) > 0;
                  const exit = out[t.key]?.exitCode;
                  const ok = typeof exit === "number" ? exit === 0 : hasOutput;
                  // время отдельного движка: достанем из stderr/stdout мету — мы её уже получаем из API
                  // проще: вернём ms из results в стейте out. Для этого чуть ниже будет п. “ms в состоянии”.
                  const ms = (out as any)[t.key]?.ms as number | undefined;

                  return (
                    <button
                      key={t.key}
                      className={`tab ${activeTab === t.key ? "active" : ""} ${hasOutput ? "" : "muted"}`}
                      onClick={() => setActiveTab(t.key)}
                      title={out[t.key]?.exitCode !== null ? `exit: ${out[t.key]?.exitCode}` : "no exit code"}
                    >
                      <span className={`dot ${ok ? "ok" : "bad"}`} aria-hidden />
                      {tabTitle(t.label, versions[t.key], ms)}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="outputControls">
            <div className="controlGroup">
              <span className="controlLabel">Copy</span>
              <button className="btn" onClick={() => copyActive("stdout")}>
                stdout
              </button>
              <button className="btn" onClick={() => copyActive("stderr")}>
                stderr
              </button>
            </div>
            <div className="controlGroup">
              <span className="controlLabel">Download</span>
              <button className="btn" onClick={() => downloadActive("stdout")}>
                stdout
              </button>
              <button className="btn" onClick={() => downloadActive("stderr")}>
                stderr
              </button>
            </div>
          </div>

          <div className="outputs">
            {tabs.map((t) => (
              <div key={t.key} style={{ display: activeTab === t.key ? "block" : "none" }} className="output">
                {showOnlyErrFor(t.key) ? (
                  <>
                    <div className="streamTitle">stderr</div>
                    <pre className="stderr">{out[t.key]?.stderr || "(no stderr)"}</pre>
                  </>
                ) : (
                  <>
                    <div className="streamTitle">stdout</div>
                    <pre className="stdout">{out[t.key]?.stdout || "(no stdout)"}</pre>
                    <div className="streamTitle">stderr</div>
                    <pre className="stderr">{out[t.key]?.stderr || "(no stderr)"}</pre>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial;
          color: #111;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .brandName {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }
        .brandLogo {
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.25);
        }
        .samplesWrap {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          min-width: 0;
        }
        .samplesHeader {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
          max-width: 420px;
        }
        .samplesTitle {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .samplesDescription {
          font-size: 12px;
          color: #475569;
          line-height: 1.4;
        }
        .sampleScroller {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
          max-width: 100%;
        }
        .sampleScroller::-webkit-scrollbar {
          height: 6px;
        }
        .sampleScroller::-webkit-scrollbar-thumb {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 999px;
        }
        .btn.sampleChip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 999px;
          border-color: #cbd5f5;
          background: #f8fafc;
          color: #0f172a;
          white-space: nowrap;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
        .btn.sampleChip:hover {
          background: #e2e8f0;
        }
        .btn.sampleChip.active {
          background: #0f172a;
          color: #fff;
          border-color: #0f172a;
          box-shadow: 0 0 0 1px #0f172a;
        }
        .splitter {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e2e8f0;
          border-radius: 999px;
          cursor: col-resize;
          touch-action: none;
          min-height: 120px;
        }
        .splitter:hover {
          background: #cbd5f5;
        }
        .splitter:focus-visible {
          outline: 2px solid #0f172a;
          outline-offset: 2px;
        }
        .splitterGrip {
          width: 4px;
          height: 32px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.45);
        }
        .resizing-cursor,
        .resizing-cursor * {
          cursor: col-resize !important;
        }
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .token-native-intrinsic {
          color: #facc15;
          font-weight: 600;
        }
        .bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        .left,
        .right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #374151;
        }
        .meta {
          font-size: 12px;
          color: #374151;
        }
        .versions {
          display: flex;
          gap: 6px;
        }
        .chip {
          padding: 3px 8px;
          border: 1px solid #d1d5db;
          border-radius: 999px;
          font-size: 12px;
          background: #fff;
          color: #111827;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 10px 1fr;
          gap: 12px;
          padding: 12px;
        }
        .panel {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .panelHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
          background: #fafafa;
        }
        .editorWrap {
          flex: 1;
          min-height: 0;
        }
        .tabs {
          display: flex;
          gap: 6px;
        }
        .tab {
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fff;
          font-weight: 600;
          font-size: 14px;
          color: #111827;
        }
        .tab.active {
          background: #111827;
          color: #fff;
          border-color: #111827;
        }
        .tab.muted {
          opacity: 0.7;
        }
        .outputs {
          flex: 1;
          overflow: auto;
        }
        .outputControls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
        }
        .controlGroup {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .controlLabel {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .output {
          padding: 8px 12px;
        }
        .streamTitle {
          margin: 6px 0 4px;
          font-size: 12px;
          color: #374151;
          font-weight: 600;
        }
        pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-size: 12px;
          line-height: 1.5;
        }
        pre.stdout {
          color: #065f46;
        }
        pre.stderr {
          color: #7f1d1d;
        }
        .btn {
          padding: 6px 10px;
          border: 1px solid #9ca3af;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
        }
        .btn.primary {
          border-color: #111827;
          background: #111827;
          color: #fff;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .badge {
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 12px;
          background: #f3f4f6;
          text-transform: lowercase;
        }
        .badge.running {
          background: #fef3c7;
        }
        .badge.done {
          background: #dcfce7;
        }
        .badge.error {
          background: #fee2e2;
        }
        .tab {
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fff;
          font-weight: 600;
          font-size: 14px;
          color: #0f172a;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .tab.active {
          background: #0f172a;
          color: #fff;
          border-color: #0f172a;
        }
        .tab.muted {
          opacity: 0.7;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #9ca3af;
          display: inline-block;
        }
        .dot.ok {
          background: #22c55e;
        }
        .dot.bad {
          background: #ef4444;
        }

        pre.stdout {
          color: #0f766e;
          background: #f0fdfa;
          border: 1px solid #ccfbf1;
          border-radius: 8px;
          padding: 8px;
        }
        pre.stderr {
          color: #991b1b;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: 8px;
          padding: 8px;
        }
      `}</style>
    </div>
  );
}
