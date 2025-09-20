"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Editor from "@monaco-editor/react";

type EngineKey = "v8" | "sm" | "hermes";
type EngineResult = { exitCode: number | null; stdout: string; stderr: string; ms?: number };
type ApiResponse = { ok: boolean; results?: Record<string, EngineResult>; meta?: { ms: number }; error?: string };
type VersionInfo = { ok: boolean; short?: string; raw?: string; exitCode?: number | null; error?: string };
type VersionsResp = { ok: boolean; engines: Record<EngineKey, VersionInfo> };

const samples: Record<string, string> = {
  add: `function f(x){ return x + 1 }\nf(41);`,
  closure: `function f(a){ function g(b){ return a + b } return g(1) }\nf(41);`,
  loop: `function f(n){ let s=0; for(let i=0;i<n;i++) s+=i; return s }\nf(10);`,
  try: `function f(){ try { throw 1 } catch(e){ return e + 1 } }\nf();`,
};

const tabs: { key: EngineKey; label: string }[] = [
  { key: "v8", label: "V8" },
  { key: "sm", label: "SpiderMonkey" },
  { key: "hermes", label: "Hermes" },
];

export default function Page() {
  const [code, setCode] = useState(samples.add);
  const [engines, setEngines] = useState<Record<EngineKey, boolean>>({ v8: true, sm: true, hermes: true });
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [out, setOut] = useState<Record<EngineKey, EngineResult>>({
    v8: { exitCode: null, stdout: "", stderr: "" },
    sm: { exitCode: null, stdout: "", stderr: "" },
    hermes: { exitCode: null, stdout: "", stderr: "" },
  });
  const [meta, setMeta] = useState<string>("");
  const [activeTab, setActiveTab] = useState<EngineKey>("v8");
  const [versions, setVersions] = useState<Record<EngineKey, string>>({ v8: "", sm: "", hermes: "" });
  const [onlyErr, setOnlyErr] = useState<boolean>(true);

  const editorRef = useRef<any>(null);
  const onMount = useCallback((editor: any) => {
    editorRef.current = editor;
  }, []);

  const selectedEngines = useMemo(() => (Object.keys(engines) as EngineKey[]).filter((k) => engines[k]), [engines]);

  // fetch versions once
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/versions", { cache: "no-store" });
        const data: VersionsResp = await r.json();
        const v: Record<EngineKey, string> = { v8: "", sm: "", hermes: "" };
        (["v8", "sm", "hermes"] as EngineKey[]).forEach((k) => {
          const s = data?.engines?.[k];
          v[k] = s?.ok ? s.short || "ok" : "unavailable";
        });
        setVersions(v);
      } catch {
        setVersions({ v8: "n/a", sm: "n/a", hermes: "n/a" });
      }
    })();
  }, []);

  const run = useCallback(async () => {
    setStatus("running");
    setOut({
      v8: { exitCode: null, stdout: "", stderr: "" },
      sm: { exitCode: null, stdout: "", stderr: "" },
      hermes: { exitCode: null, stdout: "", stderr: "" },
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
      });
      if (data.meta) setMeta(`Duration: ${data.meta.ms} ms`);
      setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setMeta(e?.message || "Error");
    }
  }, [code, selectedEngines]);

  const setSample = (key: keyof typeof samples) => setCode(samples[key]);

  const copyActive = async (stream: "stdout" | "stderr") => {
    const txt = out[activeTab]?.[stream] || "";
    await navigator.clipboard.writeText(txt);
  };

  const tabTitle = (label: string, ver?: string, ms?: number) =>
    `${ver ? `${label} · ${ver}` : label}${typeof ms === "number" ? ` · ${ms}ms` : ""}`;

  const downloadActive = (stream: "stdout" | "stderr") => {
    const nameMap = {
      v8: { stdout: "v8.bytecode.txt", stderr: "v8.stderr.txt" },
      sm: { stdout: "spidermonkey.bytecode.txt", stderr: "spidermonkey.stderr.txt" },
      hermes: { stdout: "hermes.dis.txt", stderr: "hermes.stderr.txt" },
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
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <div className="panelHead">
            <strong>Editor</strong>
            <div className="gap">
              <span>Samples:</span>
              <button className="btn" onClick={() => setSample("add")}>
                add
              </button>
              <button className="btn" onClick={() => setSample("closure")}>
                closure
              </button>
              <button className="btn" onClick={() => setSample("loop")}>
                loop
              </button>
              <button className="btn" onClick={() => setSample("try")}>
                try/catch
              </button>
            </div>
          </div>
          <div className="editorWrap">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              onMount={onMount}
              options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
          </div>
        </section>

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
            <div className="gap">
              <div className="dual">
                <button className="btn" onClick={() => copyActive("stdout")}>
                  Copy stdout
                </button>
                <button className="btn" onClick={() => copyActive("stderr")}>
                  Copy stderr
                </button>
              </div>
              <div className="dual">
                <button className="btn" onClick={() => downloadActive("stdout")}>
                  Download stdout
                </button>
                <button className="btn" onClick={() => downloadActive("stderr")}>
                  Download stderr
                </button>
              </div>
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
          color: #ffffff;
        }
        .brandLogo {
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.25);
        }
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
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
          grid-template-columns: 1fr 1fr;
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
        .gap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dual {
          display: flex;
          gap: 6px;
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
