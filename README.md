# 🧩 JSLab — JavaScript Engine Bytecode Explorer

**JSLab.cc** is an experimental platform for visualizing and comparing  
how different JavaScript engines (V8, SpiderMonkey, JavaScriptCore, Hermes)  
parse, compile, and optimize your code under the hood.

The site lets you:
- View **AST**, **bytecode**, and **IR** for multiple engines.
- Compare **optimization pipelines** and **deoptimization traces**.
- Upload and visualize **engine logs** (like `v8.log`).
- Share reproducible code snippets for educational or research purposes.

---

## 🚀 Features

### 🔸 Supported Engines
| Engine | Output Types | Notable Flags |
|--------|---------------|----------------|
| **V8** | AST / Bytecode / TurboFan Graph | `--print-bytecode`, `--trace-opt`, `--allow-natives-syntax`, `--log-all` |
| **SpiderMonkey** | Bytecode (`dis()`) | `--baseline-eager`, `--ion-eager` |
| **JavaScriptCore** | Bytecode / DFG Graph | `--dumpBytecode`, `--dumpGraph`, `--useDollarVM=1` |
| **Hermes** | IR / Bytecode | `-dump-ir`, `-dump-bytecode`, `-O` |

---

## 💡 Project Vision

JSLab aims to be a **compiler explorer** for JavaScript engines —  
a place to experiment, learn, and visualize the internals of modern JIT compilers.

Goals:
1. Provide a visual way to understand how JavaScript is executed.
2. Compare bytecode and optimization stages across engines.
3. Serve as an educational and research platform for JS internals.

---

## 🧱 Repository Structure

---

## 🗺 Roadmap Overview

### Phase 1 — Core MVP
- Engine selector and preset flags  
- Sandbox API `/api/run`  
- Execution history and “Share session” links  

### Phase 2 — Advanced Analysis
- AST tree visualization (`--print-ast`)  
- Bytecode diff viewer (Myers diff + Shiki)  
- TurboFan / Ignition pipeline diagram  
- Hermes IR viewer  

### Phase 3 — Community & Docs
- Opcode documentation (`/docs/{engine}/{opcode}`)  
- Multi-engine playground  
- Snippet sharing & voting  

### Phase 4 — Research Lab
- V8 heap and log visualizer (`v8.log`)  
- Flamegraph integration  
- WebAssembly comparison layer  
- AI Explain Mode for bytecode and optimization traces  

---

## ⚙️ Importing the Roadmap into GitHub Issues

### 1️⃣ Requirements
- [GitHub CLI](https://cli.github.com/) (`gh`)
- [jq](https://stedolan.github.io/jq/)
- Authenticated with GitHub:
  ```bash
  gh auth login
