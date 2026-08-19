"use client";

import {
  createRecipeContext,
  type HTMLChakraProps,
  type RecipeProps,
  Span,
} from "@chakra-ui/react";

const { withContext } = createRecipeContext({ key: "chip" });

export interface ChipRootProps extends HTMLChakraProps<"button", RecipeProps<"chip">> {}

const ChipRoot = withContext<HTMLButtonElement, ChipRootProps>("button");

export type ChipProps = {
  label: string;
  checked?: boolean;
  shape?: "box" | "radio";
  onToggle?: () => void;
} & Omit<ChipRootProps, "type" | "onToggle">;

export function Chip({
  label,
  checked = false,
  shape = "box",
  disabled,
  onToggle,
  ...rest
}: ChipProps) {
  return (
    <ChipRoot
      type="button"
      role="checkbox"
      aria-checked={checked}
      checked={checked}
      shape={shape}
      disabled={disabled}
      onClick={onToggle}
      {...rest}
    >
      <Span aria-hidden="true" data-part="mark" />
      {label}
    </ChipRoot>
  );
}
