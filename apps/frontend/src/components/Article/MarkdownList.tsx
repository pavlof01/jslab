import { Box } from "@chakra-ui/react";

import type { ListItem } from "@/lib/articles/blocks";

import MarkdownBlocks from "./MarkdownBlocks";

type Props = { ordered: boolean; start: number; items: ListItem[] };

const MarkdownList: React.FC<Props> = ({ ordered, start, items }) => {
  const tasks = items.some((item) => item.checked !== null);
  return (
    <Box
      as={ordered ? "ol" : "ul"}
      {...(ordered && start !== 1 ? { start } : {})}
      ps={tasks ? 0 : 6}
      listStyleType={tasks ? "none" : ordered ? "decimal" : "disc"}
      display="flex"
      flexDirection="column"
      gap={2}
    >
      {items.map((item) => (
        <Box as="li" key={item.key} display={item.checked === null ? "list-item" : "flex"} gap={2}>
          {item.checked !== null && (
            <input
              type="checkbox"
              checked={item.checked}
              disabled
              readOnly
              aria-label="Checklist item"
            />
          )}
          <Box flex="1" minW={0}>
            <MarkdownBlocks blocks={item.blocks} tight />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default MarkdownList;
