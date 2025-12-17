import { MAX_SPLIT, MIN_SPLIT } from "@/hooks/useSplitterScreen";
import { Box, Show } from "@chakra-ui/react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useColorModeValue } from "../ui/color-mode";

interface Props {
  panelSplit: number;
  editorCollapsed: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
}

const Splitter: React.FC<Props> = ({ panelSplit, editorCollapsed, onPointerDown, onDoubleClick }) => {
  const splitterBg = useColorModeValue("#e2e8f0", "#475569");
  const splitterGripBg = useColorModeValue("#94a3b8", "#94a3b8");

  return (
    <Show when={!editorCollapsed}>
      <Box
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(panelSplit * 100)}
        aria-valuemin={MIN_SPLIT * 100}
        aria-valuemax={MAX_SPLIT * 100}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={splitterBg}
        borderRadius="full"
        cursor="col-resize"
        minH="160px"
        flex="0 0 12px"
        w="12px"
      >
        <Box w="4px" h="32px" borderRadius="full" bg={splitterGripBg} />
      </Box>
    </Show>
  );
};

export default Splitter;
