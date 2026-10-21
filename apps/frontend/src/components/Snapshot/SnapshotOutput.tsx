import { Box } from "@chakra-ui/react";

import PlainDump from "@/app/embed/bytecode/PlainDump";
import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import type { EmbedSnapshot } from "@/lib/embedState";

type Props = { snapshot: EmbedSnapshot };

const SnapshotOutput: React.FC<Props> = ({ snapshot }) => (
  <>
    <HighlightedCode
      engineKey={snapshot.engine}
      out={snapshot.output}
      source={snapshot.code}
      showDiff={false}
      fallback={<PlainDump text={snapshot.output} />}
      emptyState={<PlainDump text="(no output)" />}
    />
    {snapshot.stderr && (
      <Box mt={3}>
        <HighlightedCode
          engineKey={snapshot.engine}
          out={snapshot.stderr}
          source={snapshot.code}
          showDiff={false}
          fallback={<PlainDump text={snapshot.stderr ?? ""} />}
          showSourceAlerts={!snapshot.output}
          emptyState={null}
        />
      </Box>
    )}
  </>
);

export default SnapshotOutput;
