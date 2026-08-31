"use client";

import { Box, Card, CodeBlock, HStack, Stack } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { SOURCE_LANG } from "@/lib/shiki";
import { sourceShikiAdapter } from "@/lib/shiki-adapter";

type Props = {
  id: string;
  title: string;
  description: string;
  snippet: string;
  active: boolean;
  onSelect: () => void;
  actions?: ReactNode;
};

const SampleCard: React.FC<Props> = ({
  id,
  title,
  description,
  snippet,
  active,
  onSelect,
  actions,
}) => {
  return (
    <Card.Root
      key={id}
      width="100%"
      size="sm"
      role="button"
      tabIndex={0}
      aria-label={`Select ${title} sample`}
      _hover={{ bg: "surface.hover", cursor: "pointer" }}
      border="1px solid"
      borderColor={active ? "accent" : "rule.panel"}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <Card.Body>
        <Stack gap={2}>
          <HStack align="flex-start" justify="space-between" gap={3}>
            <Box flex="1">
              <Card.Title>{title}</Card.Title>
              <Card.Description>{description}</Card.Description>
            </Box>
            {actions && <HStack gap={1}>{actions}</HStack>}
          </HStack>

          <CodeBlock.AdapterProvider value={sourceShikiAdapter}>
            <CodeBlock.Root
              code={snippet}
              language={SOURCE_LANG}
              size="sm"
              maxH="140px"
              overflow="auto"
            >
              <CodeBlock.Content>
                <CodeBlock.Code>
                  <CodeBlock.CodeText />
                </CodeBlock.Code>
              </CodeBlock.Content>
            </CodeBlock.Root>
          </CodeBlock.AdapterProvider>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
};

export default SampleCard;
