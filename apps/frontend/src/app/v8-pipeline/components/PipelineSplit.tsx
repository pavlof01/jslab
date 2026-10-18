"use client";

import { Splitter } from "@chakra-ui/react";

import { useStackedLayout } from "@/components/LayoutHint/context";

type Props = { editor: React.ReactNode; stages: React.ReactNode };

const PipelineSplit: React.FC<Props> = ({ editor, stages }) => {
  const isMobile = useStackedLayout();

  return (
    <Splitter.Root
      orientation={isMobile ? "vertical" : "horizontal"}
      panels={[
        { id: "editor", minSize: 15, collapsible: true, collapsedSize: 5 },
        { id: "pipeline", minSize: 30 },
      ]}
      defaultSize={[40, 60]}
      height="100%"
      overflow="hidden"
    >
      <Splitter.Panel id="editor">{editor}</Splitter.Panel>

      <Splitter.Context>
        {(ctx) => (
          <Splitter.ResizeTrigger id="editor:pipeline" onDoubleClick={() => ctx.resetSizes()} />
        )}
      </Splitter.Context>

      <Splitter.Panel id="pipeline">{stages}</Splitter.Panel>
    </Splitter.Root>
  );
};

export default PipelineSplit;
