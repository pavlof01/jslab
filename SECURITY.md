# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub's
[private vulnerability reporting](https://github.com/pavlof01/js-engines/security/advisories/new)
rather than opening a public issue. Expect an acknowledgement within a few days —
this is a side project maintained by one person, so please be patient with fixes.

## Scope

JSLab runs untrusted JavaScript on purpose. The engine services exist to execute
whatever a visitor types, so the following are **not** vulnerabilities on their own:

- Running arbitrary JavaScript inside an engine shell, crashing it, or exhausting
  its own process memory or CPU budget.
- Output from an engine binary, including whatever it prints about its internals.
- Denial of service achieved purely by staying inside the published rate limits.

What is in scope:

- Escaping an engine process: reading files outside its sandbox, reaching the
  network, executing anything on the host, or affecting another request's run.
- Reaching a service that should be unreachable — engines are only meant to be
  callable from the API gateway.
- Bypassing the flag allowlist, the source-size limit, the execution timeout, or
  the per-IP and per-key rate limits.
- Anything that lets one caller read another caller's snippets, results, or API key.

## Design notes for reviewers

- Every engine runs as a non-root user with a read-only root filesystem, no
  capabilities, and `/tmp` on an `emptyDir`.
- Client-supplied engine flags are filtered against a per-engine allowlist in both
  the gateway and the engine service; anything else is dropped and reported back
  in `meta.droppedFlags`.
- Execution is bounded by a wall-clock timeout, an output cap, and a per-pod
  concurrency gate. Spec traces run in a worker thread that is killed outright when
  it exceeds its budget.
- A NetworkPolicy denies traffic by default: only the gateway may reach the engines
  and the trace service, and the engines cannot talk to each other.
