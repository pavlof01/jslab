"use client";

import FlagSelector from "@/components/FlagSelector";
import { useFlaggedEngines } from "@/components/FlagSelector/context";
import { useEngineSelection } from "@/store/engineOutputsSelectors";

const EngineFlagPickers: React.FC = () => {
  const { engines } = useEngineSelection();
  const flaggedEngines = useFlaggedEngines();

  // A picker for an engine that is switched off would offer flags nothing will
  // run, so the toolbar shows one per enabled engine that has flags to give.
  return flaggedEngines
    .filter((engine) => engines[engine])
    .map((engine) => <FlagSelector key={engine} engine={engine} />);
};

export default EngineFlagPickers;
