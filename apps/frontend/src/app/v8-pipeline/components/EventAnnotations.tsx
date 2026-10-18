import { Button, HStack } from "@chakra-ui/react";

import { ClickPopover } from "@/components/ui";
import type { OutputAnnotation } from "@/lib/annotations";

type Props = { raw: string; annotations: OutputAnnotation[] };

const EventAnnotations: React.FC<Props> = ({ raw, annotations }) => {
  if (!annotations.length) return null;

  return (
    <HStack gap={2} wrap="wrap" mt={1}>
      {annotations.map((annotation) => (
        <ClickPopover key={annotation.id} title={annotation.title} content={annotation.text}>
          <Button
            variant="annotation"
            typeface="code"
            type="button"
            data-output-annotation={annotation.id}
          >
            {raw.slice(annotation.start, annotation.end)}
          </Button>
        </ClickPopover>
      ))}
    </HStack>
  );
};

export default EventAnnotations;
