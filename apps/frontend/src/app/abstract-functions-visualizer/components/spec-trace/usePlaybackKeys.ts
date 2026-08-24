"use client";

import { useEffect } from "react";

export function usePlaybackKeys({
  selectedIndex,
  onSelectIndex,
  onTogglePlay,
}: {
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onTogglePlay: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      if (target && isInteractive(target)) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onSelectIndex(selectedIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onSelectIndex(selectedIndex - 1);
      } else if (event.key === " ") {
        event.preventDefault();
        onTogglePlay();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedIndex, onSelectIndex, onTogglePlay]);
}

const INTERACTIVE =
  'input, textarea, select, button, a[href], [role="separator"], [contenteditable="true"]';

function isInteractive(target: HTMLElement): boolean {
  return Boolean(target.closest(INTERACTIVE));
}
