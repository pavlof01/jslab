import type { Stage } from "../lib/stages";
import type { Token } from "../lib/tokenize";
import type { StageOutput } from "../lib/usePipelineRun";
import StageBody from "./StageBody";
import StageError from "./StageError";
import StageHint from "./StageHint";

export type StageContentProps = {
  stage: Stage;
  output?: StageOutput;
  tokens: Token[];
  hasRun: boolean;
  source?: string;
};

const StageContent: React.FC<StageContentProps> = ({ stage, output, tokens, hasRun, source }) => {
  return (
    <>
      {stage.hint ? <StageHint>{stage.hint}</StageHint> : null}
      {output ? <StageError output={output} /> : null}
      <StageBody stage={stage} output={output} tokens={tokens} hasRun={hasRun} source={source} />
    </>
  );
};

export default StageContent;
