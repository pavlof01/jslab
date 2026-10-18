"use client";

import { Button } from "@chakra-ui/react";

import { useDiffToggle } from "@/store/engineOutputsSelectors";

const DiffToggleButton: React.FC = () => {
  const { showDiff, toggleDiff } = useDiffToggle();

  return (
    <Button size="sm" onClick={toggleDiff} active={showDiff}>
      diff
    </Button>
  );
};

export default DiffToggleButton;
