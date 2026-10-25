import type { BoxProps } from "@chakra-ui/react";

export type StepRowState = "pending" | "current" | "done";

export type StepTest = {
  taken: boolean;
  clause: string;
  label: string;
  state: StepRowState;
  /** Position in the playback order, exposed as `data-step-index` for scroll-follow. */
  index?: number;
};

export type StepNodeProps = {
  op: string;
  args: React.ReactNode;
  specId?: string;
  result?: string;
  /** False keeps the result in place but unseen until playback has unwound this frame. */
  resultRevealed?: boolean;
  depth?: number;
  active?: boolean;
  pending?: boolean;
  tests?: StepTest[];
  action?: React.ReactNode;
  actionState?: StepRowState;
  /** The action row's playback position, exposed like a test's `index`. */
  actionIndex?: number;
  onClick?: () => void;
  onSelectTest?: (testIndex: number) => void;
} & Omit<BoxProps, "children">;
