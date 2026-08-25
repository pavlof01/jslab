"use client";

import { QuietLink } from "@/components/ui";
import { Band } from "@/components/ui/band";
import Label from "@/components/ui/label";

function specHref(specId?: string): string {
  const linkable = specId && specId !== "BinaryExpression";
  return linkable
    ? `https://tc39.es/ecma262/#sec-${specId.toLowerCase()}`
    : "https://tc39.es/ecma262/";
}

type Props = { specId?: string };

export const SpecPaneHeader: React.FC<Props> = ({ specId }) => {
  return (
    <Band tone="pane" edge="top">
      <Label>ECMA-262{specId ? ` · ${specId}` : ""}</Label>
      <QuietLink href={specHref(specId)} mono external>
        tc39.es ↗
      </QuietLink>
    </Band>
  );
};

export const TreePaneHeader: React.FC = () => {
  return (
    <Band tone="pane" edge="top" textStyle="label" color="ink.label">
      <span>decision tree</span>
      <span>indentation = one nested call</span>
    </Band>
  );
};
