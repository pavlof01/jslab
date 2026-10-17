"use client";

import { Box, Button, Menu, Portal, Text } from "@chakra-ui/react";
import { useCallback, useMemo, useState } from "react";

import { buildSnapshotUrl, BYTECODE_EMBED_PATH } from "@/lib/embedState";
import { buildEmbedSnippet, buildShareUrl } from "@/lib/shareState";
import { enabledEngines, flagsFor } from "@/lib/types";
import { useShareableState } from "@/store/engineOutputsSelectors";

type CopyTarget = "link" | "embed" | "article" | "medium";

const COPIED_LABEL: Record<CopyTarget, string> = {
  link: "link copied",
  embed: "embed copied",
  article: "article link copied",
  medium: "medium link copied",
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

  const copyMediumLink = useCallback(
    () => copyText(buildShareUrl(window.location.origin, BYTECODE_EMBED_PATH, state), "medium"),
    [copyText, state],
  );

  const activeOut = out?.[activeTab];
  const canCopyArticleLink = Boolean(
    currentRun?.engines.includes(activeTab) && (activeOut?.stdout || activeOut?.stderr),
  );

  const copyArticleLink = useCallback(async () => {
    if (!activeOut || !currentRun || !canCopyArticleLink) return;
    const url = await buildSnapshotUrl(window.location.origin, {
      code: currentRun.code,
      engine: activeTab,
      flags: flagsFor(currentRun.flags, activeTab),
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
  }, [activeOut, activeTab, currentRun, canCopyArticleLink]);

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
            <Menu.Item value="copy-medium" onSelect={copyMediumLink}>
              <LinkOption hint="Readers can edit and run it. Annotations included.">
                Copy Medium link
              </LinkOption>
            </Menu.Item>
            <Menu.Item
              value="copy-article"
              onSelect={copyArticleLink}
              disabled={!canCopyArticleLink}
            >
              <LinkOption hint="Your output exactly as it ran. Annotations included.">
                Copy article link (output only)
              </LinkOption>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};

type LinkOptionProps = { hint: string; children: React.ReactNode };

export const LinkOption: React.FC<LinkOptionProps> = ({ hint, children }) => {
  return (
    <Box display="flex" flexDirection="column" gap="2px" py="2px">
      <span>{children}</span>
      <Text as="span" textStyle="bodySm" color="ink.5" textTransform="none" letterSpacing="normal">
        {hint}
      </Text>
    </Box>
  );
};

export default ShareButton;
