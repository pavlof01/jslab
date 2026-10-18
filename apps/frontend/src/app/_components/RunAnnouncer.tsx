"use client";

import { VisuallyHidden } from "@chakra-ui/react";

import { formatRunMeta } from "@/lib/runMessages";
import { RunStatus } from "@/lib/types";
import { useRunStatus } from "@/store/engineOutputsSelectors";

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
    <VisuallyHidden role="status" aria-live="polite">
      {announcement}
    </VisuallyHidden>
  );
};

export default RunAnnouncer;
