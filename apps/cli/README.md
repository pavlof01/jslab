# CLI (`jslab`)

A terminal client for JSLab: run one snippet through V8, Hermes, SpiderMonkey
and JavaScriptCore in a single command and read what each engine printed —
bytecode dumps, traces, or plain output.

The CLI is a client, not a fifth engine wrapper: it speaks `POST /api/run` to
the api gateway (or to `jslab.su`, which proxies the same route), so no engine
binaries are needed locally. Flags are validated against
[`packages/engine-runtime/src/flags.ts`](../../packages/engine-runtime/src/flags.ts)
— the same catalog the gateway and the engine services filter against — so a
typo fails locally instead of costing a request.

## Install

```bash
cd apps/cli
npm ci          # engine-runtime must be built first: (cd ../../packages/engine-runtime && npm ci && npm run build)
npm run build
npm link        # optional; puts `jslab` on PATH
```

Without `npm link`, run it as `node dist/index.js …` or `npm run dev -- …`.

## Usage

```bash
# every engine, asking each for bytecode
jslab --code "const add = (a, b) => a + b; add(1, 2)" --bytecode

# one engine, extra flags, from a file
jslab snippet.js -e v8 -f --print-bytecode -f --trace-opt

# from a pipe, two engines
echo "1 + '1'" | jslab -e v8,jsc

# against a local stack instead of jslab.su
jslab snippet.js --api http://localhost:8080

# machine-readable, or one file per engine
jslab snippet.js --json > run.json
jslab snippet.js --out ./dumps
```

Other commands:

- `jslab flags [engine…] [--category bytecode]` — the accepted flag catalog.
- `jslab engines` — the four engines, how each produces bytecode, and whether
  the configured endpoint answers.

Run `jslab --help` for the full option list.

## Flags

`--bytecode` asks every selected engine for bytecode. Only V8 needs a flag for
it (`--print-bytecode`); the Hermes, JSC and SpiderMonkey services already dump
bytecode on every run, so nothing is added for them.

`-f/--flag` is repeatable. An unscoped flag goes to every selected engine whose
catalog accepts it, so `-f --trace-opt -e all` means "trace optimization where
that means something" rather than an error. Prefix a flag with an engine to
scope it explicitly: `-f v8:--trace-ic`. A flag no selected engine accepts is a
typo and fails the command.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `JSLAB_API_URL` | `https://jslab.su` | Gateway or site to call (`--api` wins) |
| `JSLAB_API_KEY` | — | Sent as `x-api-key` for the higher keyed quotas (`--api-key` wins) |
| `NO_COLOR` | — | Disables colour, as does piping the output (`--color` forces it back on) |

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | every selected engine answered |
| `1` | at least one engine failed (HTTP error, timeout, unreachable gateway) |
| `2` | the command line was wrong |

## Development

- Typecheck: `npm run lint`
- Test: `npm test` (vitest)
- Run from source: `npm run dev -- --code "1 + 1" -e v8`
