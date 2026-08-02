"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Menu, Portal } from "@chakra-ui/react";
import { LuCheck, LuLink } from "react-icons/lu";

import { ENGINE_KEYS } from "@/lib/types";
import { useEngineOutputsState } from "@/store/useEngineOutputs";
import { buildEmbedSnippet, buildShareUrl } from "@/lib/shareState";

/**
 * Copies a shareable playground URL (code + engines + v8 flags encoded in the
 * `?s=` param) to the clipboard, or the same state as a ready-made <iframe>
 * snippet — the embed page had no entry point in the product before this.
 */
export default function ShareButton() {
  const { code, engines, selectedV8Flags } = useEngineOutputsState();
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);

  const state = useMemo(
    () => ({ code, engines: ENGINE_KEYS.filter((k) => engines[k]), v8Flags: selectedV8Flags }),
    [code, engines, selectedV8Flags],
  );

  const copyLink = useCallback(async () => {
    const url = buildShareUrl(window.location.origin, window.location.pathname, state);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (insecure context / permissions): fall back to the
      // URL bar so the link is still reachable.
      window.history.replaceState(null, "", url);
    }
    setCopied("link");
    window.setTimeout(() => setCopied(null), 1500);
  }, [state]);

  const copyEmbed = useCallback(async () => {
    // Absolute on the current origin — in production that is https://jslab.su,
    // which is what the snippet needs once pasted elsewhere.
    const snippet = buildEmbedSnippet(window.location.origin, state);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied("embed");
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // No URL-bar fallback makes sense for markup; leave the label unchanged
      // so the user can tell nothing was copied.
    }
  }, [state]);

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button size="sm" variant="surface" colorPalette="white" aria-label="Share this snippet">
          {copied ? <LuCheck /> : <LuLink />}
          {copied === "link" ? "Copied!" : copied === "embed" ? "Embed copied!" : "Share"}
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
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
