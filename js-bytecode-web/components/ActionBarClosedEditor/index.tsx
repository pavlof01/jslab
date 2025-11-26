import { ActionBar, Button, Portal } from "@chakra-ui/react";
import React from "react";
import { LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";

type Props = {
  editorCollapsed: boolean;
  resetSplitter: () => void;
};

const ActionsBarClosedEditor: React.FC<Props> = ({ editorCollapsed, resetSplitter }) => {
  return (
    <ActionBar.Root open={editorCollapsed}>
      <Portal>
        <ActionBar.Positioner bottom="32px" left="32px">
          <ActionBar.Content shadow="lg" borderRadius="lg">
            <ActionBar.SelectionTrigger display="flex" alignItems="center" gap={2}>
              <LuPanelLeftClose />
              Editor Hidden
            </ActionBar.SelectionTrigger>
            <ActionBar.Separator />
            <Button size="sm" colorScheme="blue" onClick={resetSplitter}>
              Show Editor <LuPanelLeftOpen />
            </Button>
          </ActionBar.Content>
        </ActionBar.Positioner>
      </Portal>
    </ActionBar.Root>
  );
};

export default ActionsBarClosedEditor;
