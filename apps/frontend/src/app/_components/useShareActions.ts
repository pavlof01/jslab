"use client";

import { useCallback, useState } from "react";

import { buildSnapshotUrl, BYTECODE_EMBED_PATH } from "@/lib/embedState";
import { buildEmbedSnippet, buildShareUrl } from "@/lib/shareState";
import { enabledEngines, flagsFor } from "@/lib/types";
import { readEditorState, useShareableRun } from "@/store/engineOutputsSelectors";

export type CopyTarget = "link" | "embed" | "snapshot" | "interactive";

const COPIED_RESET_MS = 1500;

const shareState = () => {
  const { code, engines, flags } = readEditorState();
  return { code, engines: enabledEngines(engines), flags };
};

export function useShareActions() {
  const { out, currentRun, activeTab } = useShareableRun();
  const [copied, setCopied] = useState<CopyTarget | null>(null);

  const markCopied = useCallback((target: CopyTarget) => {
    setCopied(target);
    window.setTimeout(() => setCopied(null), COPIED_RESET_MS);
  }, []);

  const copyText = useCallback(
    async (text: string, target: CopyTarget) => {
      try {
        await navigator.clipboard.writeText(text);
        markCopied(target);
      } catch {
        // Clipboard blocked (insecure context / permissions): leave the label
        // unchanged rather than claim a copy that did not happen.
      }
    },
    [markCopied],
  );

  const copyLink = useCallback(async () => {
    const url = buildShareUrl(window.location.origin, window.location.pathname, shareState());
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.history.replaceState(null, "", url);
    }
    markCopied("link");
  }, [markCopied]);

  const copyEmbed = useCallback(
    () => copyText(buildEmbedSnippet(window.location.origin, shareState()), "embed"),
    [copyText],
  );

  const copyInteractiveLink = useCallback(
    () =>
      copyText(
        buildShareUrl(window.location.origin, BYTECODE_EMBED_PATH, shareState()),
        "interactive",
      ),
    [copyText],
  );

  const activeOut = out?.[activeTab];
  const canCopySnapshotLink = Boolean(
    currentRun?.engines.includes(activeTab) && (activeOut?.stdout || activeOut?.stderr),
  );

  const copySnapshotLink = useCallback(async () => {
    if (!activeOut || !currentRun || !canCopySnapshotLink) return;
    const url = await buildSnapshotUrl(window.location.origin, {
      code: currentRun.code,
      engine: activeTab,
      flags: flagsFor(currentRun.flags, activeTab),
      output: activeOut.stdout ?? "",
      stderr: activeOut.stderr || undefined,
    });
    await copyText(url, "snapshot");
  }, [activeOut, activeTab, currentRun, canCopySnapshotLink, copyText]);

  return {
    copied,
    canCopySnapshotLink,
    copyLink,
    copyEmbed,
    copyInteractiveLink,
    copySnapshotLink,
  };
}
