import { Box, Code, Table } from "@chakra-ui/react";

import { type IntrinsicCategory, intrinsicsByCategory } from "@/lib/v8Intrinsics";

type Props = { category: IntrinsicCategory };

const IntrinsicsTable: React.FC<Props> = ({ category }) => {
  return (
    <Box overflowX="auto">
      <Table.Root size="sm" showColumnBorder>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader width="26%">Intrinsic</Table.ColumnHeader>
            <Table.ColumnHeader>What it does</Table.ColumnHeader>
            <Table.ColumnHeader width="30%">Invocation</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {intrinsicsByCategory(category).map((intrinsic) => (
            <Table.Row key={intrinsic.name}>
              <Table.Cell fontFamily="mono" color="ink.1">
                %{intrinsic.name}
              </Table.Cell>
              <Table.Cell color="ink.2">{intrinsic.description}</Table.Cell>
              <Table.Cell>
                <Code whiteSpace="pre-wrap" padding={2}>
                  {intrinsic.snippet}
                </Code>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
};

export default IntrinsicsTable;
