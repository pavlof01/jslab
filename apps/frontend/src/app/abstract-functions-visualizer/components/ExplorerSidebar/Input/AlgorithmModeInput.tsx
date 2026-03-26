"use client";

import * as React from "react";
import { Show } from "@chakra-ui/react";
import { ValueInput } from "@/app/abstract-functions-visualizer/components/ValueInput";

export function AlgorithmModeInput({
  traceInputRaw,
  onTraceInputRawChange,
  onTraceInputCommit,
}: {
  traceInputRaw?: string;
  onTraceInputRawChange?: (next: string) => void;
  onTraceInputCommit?: (input: string) => void;
}) {
  return (
    <Show when={onTraceInputRawChange}>
      <ValueInput
        label="Input Value"
        value={traceInputRaw ?? ""}
        onChange={(val) => {
          if (onTraceInputRawChange) {
            onTraceInputRawChange(val);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onTraceInputCommit) {
            e.preventDefault();
            onTraceInputCommit(traceInputRaw ?? "");
          }
        }}
        onBlur={() => {
          if (onTraceInputCommit) {
            onTraceInputCommit(traceInputRaw ?? "");
          }
        }}
        multiline
        height="80px"
        maxLength={10000}
        placeholder='e.g., {valueOf: () => 1} or "hello"'
      />
    </Show>
  );
}
