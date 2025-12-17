import { useCallback, PointerEvent as ReactPointerEvent, useRef, useState, useEffect } from "react";

export const MIN_SPLIT = 0;
export const START_SPLIT = 0.35;
export const MAX_SPLIT = 0.9;

const clampSplit = (value: number) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value));

export const useSplitter = () => {
  const [panelSplit, setPanelSplit] = useState(START_SPLIT);
  const [lastNonZeroSplit, setLastNonZeroSplit] = useState(START_SPLIT);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (panelSplit > MIN_SPLIT && Math.abs(panelSplit - lastNonZeroSplit) >= 0.0001) {
      setLastNonZeroSplit(panelSplit);
    }
  }, [panelSplit, lastNonZeroSplit]);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const handleSplitterPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const grid = gridRef.current;
    if (!grid) return;

    resizeCleanupRef.current?.();

    const handleMove = (pointerEvent: PointerEvent) => {
      const rect = grid.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = (pointerEvent.clientX - rect.left) / rect.width;
      if (!Number.isFinite(ratio)) return;
      setPanelSplit((prev) => {
        const next = clampSplit(ratio);
        return Math.abs(prev - next) < 0.0001 ? prev : next;
      });
    };

    const handleUp = () => {
      resizeCleanupRef.current?.();
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      document.body.classList.remove("resizing-cursor");
      resizeCleanupRef.current = null;
    };

    resizeCleanupRef.current = cleanup;

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    window.addEventListener("pointercancel", handleUp, { once: true });
    document.body.classList.add("resizing-cursor");
  }, []);

  const handleSplitterDoubleClick = useCallback(() => {
    setPanelSplit((prev) => (Math.abs(prev - 0.5) < 0.0001 ? prev : 0.5));
  }, []);

  const resetSplitter = useCallback(() => {
    setPanelSplit(START_SPLIT);
  }, []);

  return {
    handleSplitterPointerDown,
    handleSplitterDoubleClick,
    resetSplitter,
    panelSplit,
    gridRef,
    editorCollapsed: panelSplit <= MIN_SPLIT,
  };
};
