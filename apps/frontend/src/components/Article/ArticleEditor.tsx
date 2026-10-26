"use client";

import { Text } from "@chakra-ui/react";
import { useLayoutEffect } from "react";

import EmbedPlaygroundFrame from "@/app/embed/playground/EmbedPlaygroundFrame";
import type { ShareState } from "@/lib/shareState";
import { RunStatus, selectionFrom } from "@/lib/types";
import { supersedePendingRuns, useEngineOutputsStore } from "@/store/useEngineOutputs";

type Props = { state: ShareState };

const ArticleEditor: React.FC<Props> = ({ state }) => {
  useLayoutEffect(() => {
    // A playground run still in flight must not land here, and the playground
    // gets it back as cancelled rather than forever running.
    supersedePendingRuns();
    const saved = useEngineOutputsStore.getState();
    const restored =
      saved.status === RunStatus.running ? { ...saved, status: RunStatus.idle } : saved;
    const { reset, setCode, setEngines, setFlags } = saved;
    reset();
    setCode(state.code);
    setEngines(selectionFrom(state.engines));
    setFlags(state.flags);
    return () => {
      supersedePendingRuns();
      useEngineOutputsStore.setState(restored, true);
    };
  }, [state]);

  return (
    <EmbedPlaygroundFrame
      as="section"
      aria-label="Editor"
      layerStyle="panel"
      h={{ base: "684px", md: "464px" }}
      heading={
        <Text textStyle="label" color="ink.label">
          Try it
        </Text>
      }
    />
  );
};

export default ArticleEditor;
