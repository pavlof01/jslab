import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import DefaultEmptyCodeBlockState from "@/components/OutputsPanel/components/DefaultEmptyCodeBlockState";
import { MACHINE_CODE_LANG } from "@/lib/shiki";
import { EngineKey } from "@/lib/types";

import DeoptView from "./DeoptView";
import type { StageContentProps } from "./StageContent";
import TokensPane from "./TokensPane";

const StageBody: React.FC<StageContentProps> = ({ stage, output, tokens, hasRun, source }) => {
  if (stage.view === "tokens") {
    if (!hasRun) return <DefaultEmptyCodeBlockState />;
    return <TokensPane tokens={tokens} />;
  }

  if (stage.view === "deoptEvents") {
    return (
      <DeoptView output={`${output?.stdout ?? ""}\n${output?.stderr ?? ""}`} source={source} />
    );
  }

  if (stage.view === "machineCode") {
    return (
      <HighlightedCode
        engineKey={EngineKey.v8}
        language={MACHINE_CODE_LANG}
        out={output?.stdout}
        source={source}
        showDiff={false}
      />
    );
  }

  return (
    <HighlightedCode
      engineKey={EngineKey.v8}
      out={output?.stdout}
      source={source}
      showDiff={false}
    />
  );
};

export default StageBody;
