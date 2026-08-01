"use client";

import { useCallback, useState } from "react";
import { Button } from "@chakra-ui/react";
import { LuCheck, LuLink } from "react-icons/lu";

import { ENGINE_KEYS } from "@/lib/types";
import { useEngineOutputsState } from "@/store/useEngineOutputs";
import { buildShareUrl } from "@/lib/shareState";

/**
 * Copies a shareable playground URL (code + engines + v8 flags encoded in the
 * `?s=` param) to the clipboard. README promised shareable snippets; this is it.
 */
export default function ShareButton() {
  const { code, engines, selectedV8Flags } = useEngineOutputsState();
  const [copied, setCopied] = useState(false);

  const onShare = useCallback(async () => {
    const state = {
      code,
      engines: ENGINE_KEYS.filter((k) => engines[k]),
      v8Flags: selectedV8Flags,
    };
    const url = buildShareUrl(window.location.origin, window.location.pathname, state);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (insecure context / permissions): fall back to the
      // URL bar so the link is still reachable.
      window.history.replaceState(null, "", url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [code, engines, selectedV8Flags]);

  return (
    <Button size="sm" variant="surface" colorPalette="white" onClick={onShare} aria-label="Copy shareable link">
      {copied ? <LuCheck /> : <LuLink />}
      {copied ? "Copied!" : "Share"}
    </Button>
  );
}
