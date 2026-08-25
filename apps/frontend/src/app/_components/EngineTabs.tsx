"use client";

import { TabBar } from "@/components/ui";
import { engineLabel } from "@/lib/engines";
import { type EngineKey, type EngineResult, isEngineKey, RunStatus } from "@/lib/types";

type PaneResult = EngineResult | undefined;

function hasAnswered(result: PaneResult): boolean {
  return Boolean(result && (result.ms != null || result.stdout || result.stderr));
}

function outcomeColor(status: RunStatus, result: PaneResult): string {
  if (status === RunStatus.running) return "accent";
  if (status === RunStatus.idle || !hasAnswered(result)) return "ink.6";
  if (result?.stderr) return "status.error";
  return "status.ok";
}

function outcomeLabel(status: RunStatus, result: PaneResult): string | undefined {
  if (status === RunStatus.running) return "…";
  if (status === RunStatus.idle || !hasAnswered(result)) return undefined;
  return result?.stderr ? "stderr" : "ok";
}

type Props = {
  engines: EngineKey[];
  activeTab: EngineKey;
  onSelect: (engine: EngineKey) => void;
  out: Record<EngineKey, EngineResult>;
  status: RunStatus;
};

const EngineTabs: React.FC<Props> = ({ engines, activeTab, onSelect, out, status }) => {
  return (
    <TabBar
      items={engines.map((engine) => ({
        value: engine,
        label: engineLabel(engine),
        meta: outcomeLabel(status, out?.[engine]),
        metaColor: outcomeColor(status, out?.[engine]),
      }))}
      value={activeTab}
      onChange={(value) => {
        if (isEngineKey(value)) onSelect(value);
      }}
    />
  );
};

export default EngineTabs;
