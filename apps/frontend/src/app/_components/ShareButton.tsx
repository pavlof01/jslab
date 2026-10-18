"use client";

import { Button, Menu, Portal } from "@chakra-ui/react";
import { useCallback, useMemo, useState } from "react";

import { buildSnapshotUrl, BYTECODE_EMBED_PATH } from "@/lib/embedState";
import { buildEmbedSnippet, buildShareUrl } from "@/lib/shareState";
import { enabledEngines, flagsFor } from "@/lib/types";
import { useShareableState } from "@/store/engineOutputsSelectors";

type CopyTarget = "link" | "embed" | "snapshot" | "interactive";

const COPIED_LABEL: Record<CopyTarget, string> = {
  link: "link copied",
  embed: "embed copied",
  snapshot: "snapshot link copied",
  interactive: "interactive link copied",
};

const IDLE_LABEL = "share";

const ShareButton: React.FC = () => {
  const { code, engines, flags, out, currentRun, activeTab } = useShareableState();
  const [copied, setCopied] = useState<CopyTarget | null>(null);

  const state = useMemo(
    () => ({ code, engines: enabledEngines(engines), flags }),
    [code, engines, flags],
  );

  const copyLink = useCallback(async () => {
    const url = buildShareUrl(window.location.origin, window.location.pathname, state);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.history.replaceState(null, "", url);
    }
    setCopied("link");
    window.setTimeout(() => setCopied(null), 1500);
  }, [state]);

  const copyText = useCallback(async (text: string, target: CopyTarget) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {}
  }, []);

  const copyEmbed = useCallback(
    () => copyText(buildEmbedSnippet(window.location.origin, state), "embed"),
    [copyText, state],
  );

  const copyInteractiveLink = useCallback(
    () =>
      copyText(buildShareUrl(window.location.origin, BYTECODE_EMBED_PATH, state), "interactive"),
    [copyText, state],
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
    try {
      await navigator.clipboard.writeText(url);
      setCopied("snapshot");
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard blocked (insecure context / permissions): leave the label
      // unchanged rather than claim a copy that did not happen.
    }
  }, [activeOut, activeTab, currentRun, canCopySnapshotLink]);

  const label = copied ? COPIED_LABEL[copied] : IDLE_LABEL;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button size="sm" active={copied !== null} aria-label="Share this snippet">
          {label}
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value="copy-link" onSelect={copyLink}>
              Copy link
            </Menu.Item>
            <Menu.Item value="copy-embed" onSelect={copyEmbed}>
              Copy embed code
            </Menu.Item>
            <Menu.Item value="copy-interactive" onSelect={copyInteractiveLink}>
              Copy interactive embed link
            </Menu.Item>
            <Menu.Item
              value="copy-snapshot"
              onSelect={copySnapshotLink}
              disabled={!canCopySnapshotLink}
            >
              Copy output snapshot link
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};

export default ShareButton;
