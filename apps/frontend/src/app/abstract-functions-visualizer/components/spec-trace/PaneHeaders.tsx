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
      <QuietLink href={specHref(specId)} mono external color="ink.3" borderColor="rule.panel">
        tc39.es ↗
      </QuietLink>
    </Band>
  );
};
