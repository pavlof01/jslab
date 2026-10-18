import { Callout } from "@/components/ui";

import type { StageOutput } from "../lib/usePipelineRun";

type Props = { output: StageOutput };

const StageError: React.FC<Props> = ({ output }) => {
  if (!output.stderr || output.stdout) return null;

  return (
    <Callout
      typeface="code"
      mx={4}
      my={2}
      px={3}
      border="1px solid"
      rounded="md"
      whiteSpace="pre-wrap"
    >
      {output.stderr}
    </Callout>
  );
};

export default StageError;
