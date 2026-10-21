import { Box } from "@chakra-ui/react";

import type { TableCell, TableRow } from "@/lib/articles/blocks";

import MarkdownInline from "./MarkdownInline";

type Props = { header: TableCell[]; rows: TableRow[] };

const cellProps = {
  px: 3,
  py: 2,
  borderBottom: "1px solid",
  borderColor: "rule.structural",
  verticalAlign: "top",
} as const;

const MarkdownTable: React.FC<Props> = ({ header, rows }) => (
  <Box overflowX="auto" layerStyle="panel">
    <Box as="table" w="full" textStyle="bodySm" borderCollapse="collapse">
      <thead>
        <tr>
          {header.map((cell) => (
            <Box
              as="th"
              key={cell.key}
              textAlign={cell.align ?? "left"}
              color="ink.1"
              fontWeight="600"
              {...cellProps}
            >
              <MarkdownInline nodes={cell.children} />
            </Box>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            {row.cells.map((cell) => (
              <Box as="td" key={cell.key} textAlign={cell.align ?? "left"} {...cellProps}>
                <MarkdownInline nodes={cell.children} />
              </Box>
            ))}
          </tr>
        ))}
      </tbody>
    </Box>
  </Box>
);

export default MarkdownTable;
