import { Text } from "@chakra-ui/react";

import { Callout } from "@/components/ui";
import type { AnnotationDiagnostic } from "@/lib/annotations";

type Props = { diagnostics: readonly AnnotationDiagnostic[] };

/**
 * Mistakes in the snippet's own `@annotation` directives. Without these the
 * author only sees a missing highlight and cannot tell a typo in a directive
 * from output that simply never matched.
 */
const AnnotationAlerts: React.FC<Props> = ({ diagnostics }) => {
  if (!diagnostics.length) return null;

  return (
    <Callout tone="warn">
      {diagnostics.map((diagnostic) => (
        <Text key={`${diagnostic.line}-${diagnostic.message}`}>
          Annotation at source line {diagnostic.line}: {diagnostic.message}
        </Text>
      ))}
    </Callout>
  );
};

export default AnnotationAlerts;
