/**
 * In-realm lockdown for engine shells that EXECUTE the snippet (d8, jsc).
 *
 * Both shells register filesystem primitives as plain globals — d8 has
 * read/readbuffer/readline, jsc adds writeFile/load/run/runString on top — and
 * none of them is gated behind a flag we could drop from the allowlist. They
 * read anything the container user can reach, including the mounted
 * ServiceAccount token, so they have to be neutralized inside the realm before
 * the snippet runs.
 *
 * Reassignment first, then `delete`: these are ordinary writable globals today,
 * and overwriting keeps working even if a future build makes one
 * non-configurable. Each name is wrapped in its own try/catch so one
 * already-frozen global cannot stop the rest of the lockdown.
 *
 * This lives in the shared runtime rather than in each engine service because
 * two hand-copied sandbox escapes are one edit away from disagreeing about what
 * "locked down" means.
 */
export function buildLockdownShim(names: readonly string[]): string {
  return `
(function () {
  function deny(name) {
    return function () { throw new Error("'" + name + "' is disabled in this sandbox"); };
  }
  [${names.map((name) => JSON.stringify(name)).join(", ")}].forEach(function (name) {
    try { globalThis[name] = deny(name); } catch (e) {}
    try { delete globalThis[name]; } catch (e) {}
  });
})();
`;
}

/** Filename the runtime writes the lockdown shim to inside the temp dir. */
export const LOCKDOWN_SHIM_FILE = "lockdown-shim.js";
