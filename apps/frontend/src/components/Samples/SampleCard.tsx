"use client";

import { Box, Card, CodeBlock, createShikiAdapter, HStack, Stack } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { HighlighterGeneric } from "shiki";

import { getSourceHighlighter, SOURCE_LANG, THEME } from "@/lib/shiki";

const CODE_ADAPTER = createShikiAdapter<HighlighterGeneric<never, never>>({
  load: getSourceHighlighter,
  theme: THEME,
});

type Props = {
  id: string;
  title: string;
  description: string;
  snippet: string;
  active: boolean;
  onSelect: () => void;
  actions?: ReactNode;
};

export function SampleCard({ id, title, description, snippet, active, onSelect, actions }: Props) {
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

          <CodeBlock.AdapterProvider value={CODE_ADAPTER}>
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
}
