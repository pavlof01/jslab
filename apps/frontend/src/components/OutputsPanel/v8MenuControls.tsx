import { Stack, HStack } from "@chakra-ui/react";
import React from "react";
import V8FlagSelector from "../V8FlagSelector";
import V8Intrinsics from "../V8Intrinsics";

const V8MenuControls: React.FC = () => {
  return (
    <Stack gap={2} px={4}>
      <HStack align="center" gap={2} flexWrap="wrap">
        <V8FlagSelector />
        <V8Intrinsics />
      </HStack>
    </Stack>
  );
};

export default V8MenuControls;
