"use client";

import { Button, Menu, Portal } from "@chakra-ui/react";
import { useCallback, useMemo, useState } from "react";

import { buildSnapshotUrl } from "@/lib/embedState";
import { buildEmbedSnippet, buildShareUrl } from "@/lib/shareState";
import { enabledEngines, flagsFor } from "@/lib/types";
import { useShareableState } from "@/store/engineOutputsSelectors";

type CopyTarget = "link" | "embed" | "article";

const COPIED_LABEL: Record<CopyTarget, string> = {
  link: "link copied",
  embed: "embed copied",
  article: "article link copied",
};

const IDLE_LABEL = "share";

export default function ShareButton() {
  const { code, engines, flags, out, activeTab } = useShareableState();
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

  const copyEmbed = useCallback(async () => {
    const snippet = buildEmbedSnippet(window.location.origin, state);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied("embed");
      window.setTimeout(() => setCopied(null), 1500);
    } catch {}
  }, [state]);

  const activeOut = out?.[activeTab];
  const canCopyArticleLink = Boolean(activeOut?.stdout || activeOut?.stderr);

  const copyArticleLink = useCallback(async () => {
    if (!activeOut) return;
    const url = await buildSnapshotUrl(window.location.origin, {
      code,
      engine: activeTab,
      flags: flagsFor(flags, activeTab),
      output: activeOut.stdout ?? "",
      stderr: activeOut.stderr || undefined,
    });
    try {
      await navigator.clipboard.writeText(url);
      setCopied("article");
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard blocked (insecure context / permissions): leave the label
      // unchanged rather than claim a copy that did not happen.
    }
  }, [activeOut, activeTab, code, flags]);

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
            <Menu.Item
              value="copy-article"
              onSelect={copyArticleLink}
              disabled={!canCopyArticleLink}
            >
              Copy article link (output only)
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
