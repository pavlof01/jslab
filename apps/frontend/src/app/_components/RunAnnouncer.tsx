"use client";

import { formatRunMeta } from "@/lib/runMessages";
import { RunStatus } from "@/lib/types";
import { useRunStatus } from "@/store/engineOutputsSelectors";

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
};

const RunAnnouncer: React.FC = () => {
  const { status, durationMs, cacheHit, error, notice } = useRunStatus();

  const announcement = (() => {
    if (status === RunStatus.running) return "Running…";
    if (status === RunStatus.error && error) return error;
    if (status === RunStatus.done) {
      const meta = formatRunMeta(durationMs, cacheHit);
      return [`Run finished. ${meta || "No output timing available."}`, notice]
        .filter(Boolean)
        .join(" ");
    }
    return "";
  })();

  return (
    <div style={srOnly} role="status" aria-live="polite">
      {announcement}
    </div>
  );
};

export default RunAnnouncer;
