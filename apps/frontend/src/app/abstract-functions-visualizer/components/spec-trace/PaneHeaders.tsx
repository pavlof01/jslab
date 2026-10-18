import { QuietLink } from "@/components/ui";
import { Band } from "@/components/ui/band";
import Label from "@/components/ui/label";
import { ECMA262_URL, ecma262SectionUrl } from "@/lib/links";

function specHref(specId?: string): string {
  const linkable = specId && specId !== "BinaryExpression";
  return linkable ? ecma262SectionUrl(specId) : ECMA262_URL;
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
