"use client";

import { Chip } from "@/components/ui";
import { engineLabel } from "@/lib/engines";
import { createEngineSelection, enabledEngines, ENGINE_KEYS, EngineKey } from "@/lib/types";
import { useEngineSelection } from "@/store/engineOutputsSelectors";

const EngineToggles: React.FC = () => {
  const { engines, setEngines } = useEngineSelection();

  const toggleEngine = (engine: EngineKey) => {
    if (engine === EngineKey.v8) return;
    const active = enabledEngines(engines);
    const next = engines[engine] ? active.filter((other) => other !== engine) : [...active, engine];
    setEngines(createEngineSelection(next));
  };

  return ENGINE_KEYS.map((engine) => (
    <Chip
      key={engine}
      label={engineLabel(engine)}
      checked={engines[engine]}
      disabled={engine === EngineKey.v8}
      title={engine === EngineKey.v8 ? "V8 is always on" : undefined}
      onToggle={() => toggleEngine(engine)}
    />
  ));
};

export default EngineToggles;
