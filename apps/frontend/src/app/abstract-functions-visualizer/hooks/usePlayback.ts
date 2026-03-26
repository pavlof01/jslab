import * as React from "react";

interface PlaybackState {
  selectedIndex: number;
  setSelectedIndex: (next: number) => void;
  isPlaying: boolean;
  setIsPlaying: (next: ((prev: boolean) => boolean) | boolean) => void;
  onSelectIndex: (next: number) => void;
  maxIndex: number;
}

export function usePlayback(traceLength: number): PlaybackState {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const maxIndex = Math.max(0, traceLength - 1);

  const onSelectIndex = React.useCallback(
    (next: number) => {
      setIsPlaying(false);
      const max = Math.max(0, traceLength - 1);
      setSelectedIndex(Math.max(0, Math.min(max, next)));
    },
    [traceLength],
  );

  const prevTraceLenRef = React.useRef(0);
  React.useEffect(() => {
    const newLen = traceLength;
    setSelectedIndex((prev) => {
      if (newLen <= 0) return 0;
      const prevLen = prevTraceLenRef.current;
      if (prevLen === 0) return newLen - 1;
      if (prev === prevLen - 1) return newLen - 1;
      return Math.min(prev, newLen - 1);
    });
    prevTraceLenRef.current = newLen;
  }, [traceLength]);

  React.useEffect(() => {
    if (!isPlaying) return;
    if (traceLength <= 1) return;
    const intervalMs = 650;
    const id = window.setInterval(() => {
      setSelectedIndex((idx) => {
        if (idx >= traceLength - 1) {
          setIsPlaying(false);
          return idx;
        }
        return idx + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [isPlaying, traceLength]);

  return {
    selectedIndex,
    setSelectedIndex,
    isPlaying,
    setIsPlaying,
    onSelectIndex,
    maxIndex,
  };
}
